# 工单跟踪

工单、规格和探索地图保存在 `.scratch/` 下的 Markdown 文件中。

## 规格和工单

- 每项功能使用一个目录 `.scratch/<feature-slug>/`，规格保存在该目录的 `spec.md`。
- 每张实施工单单独保存为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，编号从 `01` 起。
- 在工单顶部附近用 `Status:` 记录分诊状态，取值见 `triage-labels.md`。在 `Type:` 中记录分诊类别 `bug` 或 `enhancement`。
- 将评论和对话记录追加到文件底部的 `## Comments` 小节。
- 发布时，按上述路径新建文件和所需目录。
- 获取工单时，读取指定路径的文件。如果只给了编号，且多个功能目录使用同一编号，先确认对应功能。

## Wayfinder 探索地图

- 地图使用 `.scratch/<effort>/map.md`，记录笔记、已作决定和待厘清的问题。
- 子工单使用 `.scratch/<effort>/issues/<NN>-<slug>.md`，从 `01` 编号，在正文记录待回答的问题。用 `Type:` 记录 `research`、`prototype`、`grilling` 或 `task`，用 `Status:` 记录 `claimed` 或 `resolved`。
- 用 `Blocked by: NN, NN` 记录依赖工单。所列工单均为 `resolved` 后，当前工单才可领取。
- 从尚未领取、尚未解决且依赖均已解决的工单中，选择编号最小的一张。开始前保存 `Status: claimed`。
- 完成后，在 `## Answer` 下追加答案，再设置 `Status: resolved`，并将结论摘要和链接追加到地图的已作决定部分。
