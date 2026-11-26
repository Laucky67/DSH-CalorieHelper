## Agent skills

### Issue tracker

发布、读取或更新工单、规格和探索地图时，读取 `docs/agents/issue-tracker.md`。本项目使用 `.scratch/` 下的本地 Markdown 文件。

### Triage labels

判断或更新工单分诊状态时，读取 `docs/agents/triage-labels.md`。本项目使用五个默认状态标签。

### Domain docs

探索代码库前，读取 `docs/agents/domain.md`。本项目采用单上下文布局。

## 前端文案

所有用户可见文案都从使用者的角度写。禁止在界面上出现「首版只支持……」这类开发者口吻，以及版本范围、开发进度、实现细节或内部错误信息。

## 前端代码结构

禁止把整块功能塞进一个巨型组件或单个 `.tsx` 文件。插件入口负责向 DSH 注册界面，页面负责组织内容和交互。表单、列表等职责独立的界面拆成组件，数据读写和业务计算放在对应模块。
