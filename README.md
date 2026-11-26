# DSH 卡路里记录

## 从 0.1 版升级

退出 DeepSeek Harness（Windows 可从托盘菜单选择「退出」），再从包含安装包的目录执行。重新打开 DSH 后，点击侧边栏的「卡路里记录」。

```powershell
dsh plugin --profile desktop add ./dsh-calorie-helper-0.2.2.tgz
```

插件会导入旧记录并将原 JSON 归档到 `DSH_HOME/storages/calorie-helper/legacy-calorie_helper.json`。之后的数据在同目录的 `calorie.sqlite`，以及 SQLite 使用中的伴随文件里。未指定 `DSH_HOME` 时，使用用户目录下的 `.dsh`。升级完成后新增的记录只会进入 SQLite，0.1 版读取的是旧格式数据。

## 备份与恢复

在当前项目已有构建产物的情况下执行以下命令。安装包内也附有 `scripts/data.mjs`，可以用 Node.js 24.9 或更新版本直接运行。

```powershell
node scripts/data.mjs backup
```

备份可在 DSH 运行时执行。命令输出独立备份文件的路径，文件位于插件目录的 `backups/`。迁移到另一台电脑时，可以携带这一份 SQLite 快照。

```powershell
$env:DSH_HOME = 'D:\DSH-恢复'
node scripts/data.mjs restore 'D:\备份\calorie-原备份文件名.sqlite'
```

在目标 DSH 停止时执行恢复。恢复命令会先检查备份完整性，并保护目标已有的数据库与伴随文件。要恢复到原目录，先退出 DSH，再把现有的 `calorie.sqlite`、`calorie.sqlite-wal` 和 `calorie.sqlite-shm` 一并另存，最后对原 `DSH_HOME` 执行恢复。
