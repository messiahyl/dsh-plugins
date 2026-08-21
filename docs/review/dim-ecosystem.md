# dsh-plugins 方案评审报告 — 生态与差异化维度

> 评审对象：`dsh-plugins` 插件总仓库（registry 安装源 + monorepo + GitHub 镜像 + 第三方收录）
> 评审日期：2026-08-21
> 证据：`registry/registry.json`、`docs/04`、`docs/05`、`docs/07`、`scripts/build-registry.mjs`、`scripts/install-from-registry.mjs`、`scripts/sync-github.sh`、`registry/third-party/*`、本地 `~/.dsh/dsh-workshop/registry.json`（dsh-recommend 实际产物，9805 条）、dsh-recommend 官方 README

---

## 一、总体结论

本仓库的生态设计意识是对的——"自有源 + 目录聚合、不替代官方与社区目录、收录≠背书、第三方强制 verified=false 且不开放 install/archive"的边界划分在同类项目中属于高水准；本地归档 + sha256 校验 + local→npm→github 通道优先级的差异化设计也成体系。但生态价值目前**全部停留在纸面**：packages/ 无一个真实插件、索引中 2 个第三方条目均无 install 通道（本仓库安装器对它们直接报"通道不可用"）、"兼容 dsh-recommend 字段超集可被 workshop 消费"的声称与 workshop 的实际消费路径（固定读取 dsh-recommend 的 data/registry.json，含评分/验证字段）不符。仓库当前是"空转的安装源"，必须通过真实插件接入 + workshop 实测对接才能兑现生态定位。

## 二、问题清单

| 严重度 | 标题 | 详情 | 建议 |
|--------|------|------|------|
| major | "兼容 dsh-recommend 字段超集、可被 workshop 消费"的声称与真实消费路径不符 | dsh-recommend 是自扫描聚合器（GitHub Actions 每 5 小时抓 `dsh-plugin` 话题 → 评分 → 深扫 → 产出 `data/registry.json`），dsh-workshop（loguhan）消费的是**这份固定源**（本地缓存 14MB/9805 条），不会自动读取 Gitee raw 上的本仓库索引；且 dsh-recommend 条目含 `score/signals/verification/sizeKb/topics/curated/awesomeLists/scanStatus` 等本仓库没有的字段、meta 结构完全不同（scoringVersion/weights/formula vs count/localCount），workshop 渲染排序/徽标时本仓库条目会缺字段。docs/04、05、07 多处写"兼容字段让既有 dsh-recommend 消费端无需改造即可渲染本目录"，未经验证 | 阶段四（workshop 对接）改为实测门槛：把本仓库源显式接入 workshop 的自定义源配置并验证"卡片渲染 + 排序/徽标兜底 + 一键安装"三件事；文档把"兼容"降级为"展示字段子集一致，消费需显式接入源"，删除"无需改造"表述；若 workshop 不支持自定义源，需向 loguhan 提需求或改为自建消费端 |
| major | 索引中的第三方条目全部不可安装，"收录"只有展示意义 | build-registry.mjs 对第三方"不开放 install/archive 字段"（防伪造通道），而 install-from-registry.mjs 的 auto 通道按 `plugin.install?.[c]` 选取——当前 dsh-browser、dsh-workshop 两条目无 install 字段，安装器输出"✗ 通道 auto 不可用。可用: "，即**收录进目录的插件一个都装不上**。收录的价值闭环（展示 → 安装）断裂 | 为第三方开放**受控 install 通道**：白名单只允许 npm 包名 / `github:owner/repo`（复用已实现的 NPM_SPEC_RE / GITHUB_SPEC_RE 校验），由 build-registry.mjs 从第三方 JSON 的 `npm`/`github` 字段生成并强制校验，不开放 local 归档与 archive/checksum 自填；或明确"本仓库第三方只展示不代装，安装走 dsh-recommend 话题曝光"，并在索引与安装器报错里写清 |
| major | 无真实插件，安装源空转，差异化价值无载体 | packages/ 仅 `_template`，registry meta 显示 `localCount: 0`、`archivedCount: 0`——本地归档通道、sha256 校验、国内直连等全部差异化能力没有真实载体可演示，阶段五"多机器安装源验证"无从谈起；首个插件接入路径（create-plugin → publish）存在，但与 dsh-web-ui 全家桶（18 包）的收编/联动策略未成文（README 仅列为"参考实现"，docs/07 待确认 #5 记录"联动需跨仓协作"） | 把 dsh-web-ui 全家桶定为**首个接入批次**并明确二选一策略：收编进 packages/（成为本地插件，吃满归档/校验通道）或收录为第三方并打通受控 install；在 docs/07 阶段计划中把"≥1 个真实本地插件 + workshop 可见"设为阶段四 workshop 对接的前置验收，否则对接无对象 |
| major | GitHub 曝光路径只有提醒没有落地，且聚合仓库有被深扫排除的风险 | sync-github.sh 仅 echo"若仓库名/话题命中扫描规则会出现在 workshop"，无任何落地操作：不设置 topics（`gh repo edit --add-topic dsh-plugin`）、不检查描述长度（dsh-recommend quality 信号要求 description ≥40 字符）、不提示深扫规则——dsh-recommend 对前 200 名做插件性深扫（检测 dsh 声明 / @deepseek-ai 依赖 / cordis 配置 / skills 特征），本仓库是**聚合仓库**，根目录无插件包声明，很可能被判"非插件"排除出榜；即便入榜，整仓作为单一条目进入目录，"一键安装"语义（装整个 monorepo？）未定义 | sync-github.sh 增加可选 `--expose` 模式：`gh repo edit --add-topic dsh-plugin` + 设置 ≥40 字符描述 + 打印深扫规则与仓库级条目的影响；文档写明"整仓单条目"的曝光形态；若目标是子插件逐个曝光，给出两条可选路径（每个 packages/* 独立建仓，或把仓库提交进 awesome-dsh-plugin 类 hub 目录拿 ecosystem 信号） |
| minor | 第三方收录审核标准过薄，无流程 | registry/third-party/README.md 仅 23 行：有审查方向（源码可读性/依赖/postinstall/敏感权限）但无 checklist、无流程（谁审、结果记录在哪、如何提交收录 PR、如何移除/下架）、无争议处理；"收录前建议审查"停留在建议而非门禁，审核结论无落盘字段 | 扩展 third-party/README 或新增 CONTRIBUTING：收录 PR 模板（必填 url/npm 或 github 字段以打通 install）、审查 checklist（依赖树/postinstall/敏感权限/许可证）、审核记录字段（`audit: {date, reviewer, notes}`）写入 third-party JSON；明确移除机制（发现恶意依赖/投毒时的下架流程） |
| minor | verified 语义与 dsh-recommend 生态的验证体系不互认 | 本仓库 verified 是"是否经本仓库审查"（本地插件恒 true、第三方恒 false），而 dsh-recommend/workshop 生态的验证是 `verification.staticSecurity`（静态安全扫描 passed/warnings/risk）+ `scanStatus`（深扫插件性）+ 🏅 精选认证——语义、数据来源、渲染位置都不同，本仓库的 verified 徽标只在自家消费端可见，无法与生态验证互认，docs 也未解释两者关系 | docs/05、07 明确"verified = 本仓库审查标记，非生态认证"，并说明与 dsh-recommend 静态安全扫描/精选认证的关系（可引用其 badge URL 做互认）；若后续做背书，采用独立维护者清单（registry/verified.json）而非在条目标记上扩展 |
| minor | 消费端安装器获取路径缺失，--remote 无法独立使用 | docs/04、06 演示的远端消费路径是"clone 仓库 → node scripts/install-from-registry.mjs --remote"，但 install-from-registry.mjs 是仓库内脚本，--remote 只拉索引，远端用户仍需先拿到脚本本身；README 全程按仓库内视角写作，未回答"别人怎么用你的安装源"这一生态第一问 | 文档新增"远端消费者"一节：提供单文件分发路径（curl 下载 install-from-registry.mjs 到本地执行 + --remote），或把安装器发布为 npm 全局工具/独立脚本仓库；README 安装源一节补"外部用户消费本源的三种方式" |

## 三、亮点

1. **生态边界诚实且清晰**：docs/07 明确"不替代官方 @deepseek-ai/dsh-* 平台包与 dsh-recommend 社区目录，定位是自有源 + 目录聚合"，避免与官方/社区源正面冲突——这是自建源最容易踩的定位坑，本仓库处理正确。
2. **收录≠背书 + 防伪造设计**：第三方强制 verified=false、不开放 install/archive 自填、安装器对索引 install 字段做白名单校验（NPM_SPEC_RE/GITHUB_SPEC_RE + spawnSync 不经 shell）——"第三方不得自证背书、不得伪造安装通道"的设计在同类仓库中少见且方向正确。
3. **差异化设计成体系**：本地归档（Gitee 直连）+ sha256 校验环 + local→npm→github 通道优先级，直接命中"国内网络 + 可信度"两个真实痛点，且安全边界（校验失败默认拒绝、postinstall 风险提示）有文档化意识。
4. **识别了生态主入口并规划实测**：docs/07 阶段四把 workshop 对接设为验证项（"兼容字段只有真实对接过才知是否够用"），并诚实标注 GitHub owner、gitee 通道用途等待确认项——规划层面对生态的不确定性有自觉。

---

*注：本报告为六维度评审的"生态与差异化"维度；安全维度的重复项（第三方可自证背书等）已在安全评审中覆盖，此处只从生态消费角度补充。*
