# AGENTS.md

本仓库严格按 SPEC.md 构建。铁律:
1. 数据库是 MySQL 8,不是 SQLite。连接串用 mysql+pymysql。
2. 一次只完成 SPEC.md 里的一个 STAGE,完成后运行该 STAGE 的"✅验证命令"并贴出真实输出。
3. 未通过验证不得进入下一个 STAGE。报错先修当前 STAGE。
4. 不更换技术栈、库、目录结构。所有配置进 .env,禁止硬编码密码。
5. 所有接口返回 {"code":0,"msg":"ok","data":...}。
6. 每完成一个 STAGE,用 git 提交一次。
