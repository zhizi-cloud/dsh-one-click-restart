# 分享这个插件

三份现成文案，直接复制使用。发布前请把 `CHANGE-ME` 换成你的 GitHub 用户名
（`package.json` 里也有三处同样的占位）。

---

## 一、一句话版（群聊 / 社交媒体 / 论坛签名）

> **DeepSeek Harness 卡死了怎么办？** 这个插件在标题栏加了一个刷新图标和一个系统级快捷键——
> **即使宿主进程完全无响应也能把应用重启**，而且重启后会自动接着跑被打断的任务。

---

## 二、短介绍（GitHub 仓库简介 / 插件市场描述，约 100 字）

> **dsh-one-click-restart** —— 给 DeepSeek Harness 的"一键重启"。
>
> DSH 卡住时，你既点不动界面、也重启不了它，还得自己回想刚才有哪些任务在跑。这个插件把三件事一起解决：
>
> - **点得动**：标题栏右上角一个刷新图标
> - **点不动也能救**：系统级热键由**独立于 DSH 进程树的看门狗**监听，连宿主事件循环卡死时照样生效
> - **不用回忆**：后台持续记录"当前在跑什么"，重启后自动接续中断的工作
>
> **零运行时依赖**（只用 Windows 自带的 PowerShell 5.1），自带设置页（改键 / 熔断阈值 / 恢复范围 / 重启历史）。

---

## 三、长介绍（发文章 / 写 README 首屏用）

### 一个真实的困境

DSH 卡住的时候，你面对的是一个死结：

- 界面点不动，**按钮类插件此时全都失效**——因为它们跑在同一个进程里；
- 任务管理器里能看到的是一串 `DeepSeek Harness.exe`，你不知道该杀哪个；
- 就算重启成功了，**刚才在跑的任务也全没了**，只能凭记忆一个个找回来。

### 它怎么解

**① 一个图标** —— 标题栏右上角工具区最右侧，刷新图标，悬停显示当前实际生效的快捷键。

**② 一个真正独立的看门狗** —— 热键不是由 DSH 自己监听的。插件会启动一个**脱离 DSH 进程树的 PowerShell 进程**，由它注册系统级热键、执行关闭与重启。**宿主卡死时，这个通道依然工作**——这正是整个设计存在的理由。

**③ 一份持续快照** —— 插件每隔几秒就把"当前在跑什么"原子写入磁盘。**关键在于它是持续写的，而不是在重启那一刻才写**——真卡死的进程，那一刻什么也写不出来。

### 一个能说明工程质量的细节

调试期间最难的一个问题：日志显示"已重新启动"，用户却仍然要手动打开应用。

看门狗自己的日志在这里**恰好沉默了**——而**一个停止写日志的进程无法解释自己为什么停**。解法是另起一个**独立观察者进程**，每 200ms 从外部采样"看门狗是否还活着、应用有几个进程"。它记录下的事实是：

```
watchdogAlive=True  appProcesses=5
watchdogAlive=True  appProcesses=0
watchdogAlive=True  appProcesses=1
watchdogAlive=True  appProcesses=6
```

看门狗全程存活、应用确实被拉了起来——于是问题被锁定在别处（`Start-Process` 在宿主后代的位置**静默创建不了任何进程**，最终改用 WMI 解决）。

这个观察者被保留在插件里，每次重启都会运行。**下次出问题时，它会先于任何猜测给出答案。**

### 诚实的边界

- **后台任务（job）无法自动重放**：dsh 给出的 `JobView` 不携带原始命令，命令存在于一个无法持久化的函数里。与其实现一个会静默跑错命令的版本，不如不做。
- **"自动补继续"默认建议关闭**：它靠往输入框写「继续」来工作，而 dsh 没有暴露读取当前草稿的接口，因此无法保证不覆盖你正在输入的内容。

---

## 四、发布检查清单

```bash
# 1. 初始化并提交
cd "E:\xiazai\DS\work area\dsh-one-click-restart"
git init
git add -A
git commit -m "feat: one-click restart for DeepSeek Harness"

# 2. 关联 GitHub 上新建的空仓库（不要勾选 Add a README）
git remote add origin https://github.com/CHANGE-ME/dsh-one-click-restart.git
git branch -M main
git push -u origin main

# 3. 打 tag 并做 Release，把 tgz 作为附件上传
git tag v1.0.0
git push origin v1.0.0

# 4.（可选）发布到 npm
npm login
npm publish --access public
```

**发布前替换**：`package.json` 里三处 `CHANGE-ME`（`repository` / `homepage` / `bugs`）。

**注意 `.gitignore` 的取舍**：它**排除 `node_modules` 和 `.tgz`，但保留 `lib/`** ——
因为没有 `lib/` 别人就无法直接加载，得自己构建。
