from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from typing import Any, Dict

from .client import ClaudeClient
from .prompts import (
    build_ground_conditions_prompt,
    build_schedule_prompt,
    build_section_bundle_prompt,
    build_section_prompt,
)


PROJECT_TYPE_PROFILES = {
    "public": {
        "required_sections": [
            "表紙",
            "工事概要",
            "工事内容",
            "計画工程表",
            "施工管理計画",
            "安全衛生管理計画",
            "交通管理",
            "環境対策",
        ],
        "focus": "共通仕様書・特記仕様・段階確認・出来形管理を優先",
    },
    "private_solar": {
        "required_sections": [
            "表紙",
            "工事概要",
            "工事内容",
            "計画工程表",
            "施工方法",
            "施工管理計画",
            "安全衛生管理計画",
            "交通管理",
            "環境対策",
        ],
        "focus": "土木・架台・パネル・電気連系の工程整合を優先",
    },
    "private_other": {
        "required_sections": [
            "表紙",
            "工事概要",
            "工事内容",
            "計画工程表",
            "施工方法",
            "施工管理計画",
            "安全衛生管理計画",
        ],
        "focus": "契約仕様と社内標準の整合を優先",
    },
}


class AgentService:
    def __init__(self, api_key: str, model: str, enabled: bool):
        self.client = ClaudeClient(api_key=api_key, model=model, enabled=enabled)

    def run(self, task: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if task == "ground_conditions":
            return self._ground_conditions(payload)
        if task == "schedule":
            return self._schedule(payload)
        if task == "section_draft":
            return self._section_draft(payload)
        if task == "section_bundle":
            return self._section_bundle(payload)
        raise ValueError(f"unsupported task: {task}")

    def _ground_conditions(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        prompt = build_ground_conditions_prompt(payload)
        remote = self.client.ask(prompt, max_tokens=2000)
        if remote.source == "claude":
            parsed = self._parse_json_or_none(remote.text)
            if parsed:
                parsed["_source"] = "claude"
                return parsed

        return {
            "access_points": ["既設作業道（要図面確認）"],
            "egress": "進入路と同一（単一路前提）",
            "single_access": True,
            "koutei_takasa": "不明・要確認",
            "koubai": "不明・要確認",
            "juki_shamen_toko": "急斜面時は不可想定、作業道到達範囲を重機施工",
            "taikyo_gensoku": "完成構造物を踏まない・退路を切らない順序で施工",
            "hogo_taisho": ["完成した土留・舗装・法面"],
            "warnings": ["PDF図面未解析のため暫定値"],
            "_source": "local",
        }

    def _schedule(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        context = payload.get("extract", payload)
        genba = self._link_grounding(payload.get("genba_joken"), context)
        prompt = build_schedule_prompt(context=context, genba_joken=genba)
        remote = self.client.ask(prompt, max_tokens=3000)
        if remote.source == "claude":
            parsed = self._parse_json_or_none(remote.text)
            if parsed:
                parsed["genba_joken"] = genba
                parsed["grounding"] = self._grounding_meta(genba)
                parsed["_source"] = "claude"
                return parsed

        today = date.today()
        end = today + timedelta(days=180)
        tasks = [
            self._task("t1", "準備工", "準備工", today, 7, [], 6),
            self._task("t2", "土工（切土・盛土）", "土工", today + timedelta(days=7), 35, ["t1"], 28),
            self._task("t3", "排水路工", "排水路工", today + timedelta(days=21), 28, ["t2"], 16),
            self._task("t4", "杭・架台工", "発電所設備", today + timedelta(days=50), 45, ["t2"], 24),
            self._task("t5", "パネル・電気連系", "電気設備", today + timedelta(days=95), 45, ["t4"], 18),
            self._task("t6", "出来形確認・是正", "管理", today + timedelta(days=140), 20, ["t3", "t5"], 8),
        ]
        return {
            "kouki": {
                "start": today.isoformat(),
                "end": end.isoformat(),
            },
            "tasks": tasks,
            "notes": [
                "工期終盤2週間は検査・是正バッファとして確保",
                "退路確保と完成品保護を優先して順序を設定",
            ],
            "genba_joken": genba,
            "grounding": self._grounding_meta(genba),
            "_source": "local",
        }

    def _section_draft(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        section = payload.get("section", "施工方法")
        project_type = self._normalize_project_type(payload.get("project_type", "private_solar"))
        context = payload.get("context", {})
        prompt = build_section_prompt(section=section, project_type=project_type, context=context)
        remote = self.client.ask(prompt, max_tokens=1800)
        if remote.source == "claude":
            parsed = self._parse_json_or_none(remote.text)
            if parsed:
                parsed["profile"] = PROJECT_TYPE_PROFILES[project_type]
                parsed["_source"] = "claude"
                return parsed

        if project_type == "public":
            body = "共通仕様書・特記仕様に基づき、段階確認・出来形・品質・安全の順で実施する。"
            checks = ["特記仕様の適用条件", "段階確認実施時期", "出来形測定計画"]
        else:
            body = "土木工程後に架台・パネル・電気連系を接続し、発注者要求仕様に合わせて統合管理する。"
            checks = ["重機退路と完成品保護", "架台・パネル据付順", "連系試験日程"]

        return {
            "section": section,
            "body": body,
            "checkpoints": checks,
            "profile": PROJECT_TYPE_PROFILES[project_type],
            "_source": "local",
        }

    def _section_bundle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        project_type = self._normalize_project_type(payload.get("project_type", "private_solar"))
        context = payload.get("context", {})
        required_sections = PROJECT_TYPE_PROFILES[project_type]["required_sections"]

        prompt = build_section_bundle_prompt(
            project_type=project_type,
            required_sections=required_sections,
            context=context,
        )
        remote = self.client.ask(prompt, max_tokens=3500)
        if remote.source == "claude":
            parsed = self._parse_json_or_none(remote.text)
            if isinstance(parsed, dict) and isinstance(parsed.get("sections"), list):
                parsed["project_type"] = project_type
                parsed["profile"] = PROJECT_TYPE_PROFILES[project_type]
                parsed["_source"] = "claude"
                return parsed

        sections = []
        for sec in required_sections:
            drafted = self._section_draft(
                {
                    "section": sec,
                    "project_type": project_type,
                    "context": context,
                }
            )
            sections.append(
                {
                    "section": sec,
                    "body": drafted.get("body", ""),
                    "checkpoints": drafted.get("checkpoints", []),
                }
            )

        return {
            "project_type": project_type,
            "profile": PROJECT_TYPE_PROFILES[project_type],
            "sections": sections,
            "_source": "local",
        }

    def _link_grounding(self, provided: Dict[str, Any] | None, context: Dict[str, Any]) -> Dict[str, Any]:
        base = self._ground_conditions(context)
        if isinstance(provided, dict):
            merged = {**base, **provided}
        else:
            merged = base

        # Force required grounding keys to exist so schedule is always linked.
        for k in [
            "access_points",
            "egress",
            "single_access",
            "koutei_takasa",
            "koubai",
            "juki_shamen_toko",
            "taikyo_gensoku",
            "hogo_taisho",
            "warnings",
        ]:
            if k not in merged:
                merged[k] = base.get(k)
        merged["_grounding_id"] = merged.get("_grounding_id") or uuid.uuid4().hex[:10]
        return merged

    @staticmethod
    def _grounding_meta(genba: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "linked": True,
            "grounding_id": genba.get("_grounding_id"),
            "egress": genba.get("egress", ""),
            "single_access": bool(genba.get("single_access", False)),
        }

    @staticmethod
    def _normalize_project_type(project_type: str) -> str:
        if project_type in PROJECT_TYPE_PROFILES:
            return project_type
        return "private_other"

    @staticmethod
    def _parse_json_or_none(text: str):
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        s = min((i for i in [text.find("{"), text.find("[")] if i >= 0), default=-1)
        e = max(text.rfind("}"), text.rfind("]"))
        if s >= 0 and e > s:
            try:
                return json.loads(text[s : e + 1])
            except json.JSONDecodeError:
                return None
        return None

    @staticmethod
    def _task(task_id: str, name: str, koshu: str, start: date, days: int, deps: list[str], weight: int):
        end = start + timedelta(days=days - 1)
        return {
            "id": task_id,
            "name": name,
            "koshu": koshu,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "days": days,
            "deps": deps,
            "weight": weight,
            "qty": "設計書確認",
            "naiyo": "現場条件に基づき退路を確保しながら施工",
            "team": "施工管理1名 + 作業員・重機",
            "daily": "日進量は設計数量と機械構成で算定",
            "formula": "数量 ÷ 日進量 = 日数",
            "source": "設計書・共通仕様書・社内実績",
        }
