GROUND_RULES = """
あなたは1級土木施工管理技士です。以下を絶対遵守:
1) 図面にない退路・道路・構造物を創作しない。
2) 重機は完成構造物を踏まない順序で計画する。
3) 進入路と退去路を一致させ、退路を確保する。
4) 読めない情報は推測せず「不明・要確認」とする。
""".strip()


def build_ground_conditions_prompt(context: dict) -> str:
    return f"""
{GROUND_RULES}

次の工事情報を基に、現場条件をJSONで返してください。
context={context}

出力:
{{
  "access_points": ["..."],
  "egress": "...",
  "single_access": true,
  "koutei_takasa": "...",
  "koubai": "...",
  "juki_shamen_toko": "...",
  "taikyo_gensoku": "...",
  "hogo_taisho": ["..."],
  "warnings": ["..."]
}}
""".strip()


def build_schedule_prompt(context: dict, genba_joken: dict) -> str:
    return f"""
{GROUND_RULES}

工事情報: {context}
現場条件: {genba_joken}

週休2日を前提に、工期終了2週間前に主要作業が完了する工程案をJSONで返してください。
出力:
{{
  "kouki": {{"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}},
  "tasks": [
    {{
      "id":"t1","name":"...","koshu":"...","start":"...","end":"...","days":0,
      "deps":[],"weight":0,"qty":"","naiyo":"","team":"","daily":"","formula":"","source":""
    }}
  ],
  "notes": ["..."]
}}
""".strip()


def build_section_prompt(section: str, project_type: str, context: dict) -> str:
    return f"""
施工計画書の章「{section}」の下書きをJSONで返してください。
工事種別: {project_type}
工事情報: {context}

公共工事なら共通仕様書を優先、民間太陽光なら土木+架台+パネル+電気連系に触れること。
出力:
{{"section":"{section}","body":"...","checkpoints":["..."]}}
""".strip()


def build_section_bundle_prompt(project_type: str, required_sections: list[str], context: dict) -> str:
    return f"""
施工計画書の必須章を工事種別に合わせて一括起案してください。
工事種別: {project_type}
必須章: {required_sections}
工事情報: {context}

ルール:
- 公共工事: 共通仕様書、段階確認、出来形/品質/写真管理を重視。
- 民間太陽光: 土木+架台+パネル+電気連系の工程整合を重視。
- 図面に無い経路・条件を創作しない。

出力(JSONのみ):
{{
  "project_type":"{project_type}",
  "sections":[
    {{"section":"章名","body":"本文","checkpoints":["確認項目"]}}
  ]
}}
""".strip()
