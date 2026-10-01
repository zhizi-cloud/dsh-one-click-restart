# 从零开始：把 dsh-one-click-restart 上传到 GitHub

写给完全没做过这件事的人。**按顺序做**，每一步都有验证方法——做完一步确认一步，出问题只会在当前这一步。

> 你机器当前的状态（我已经查过）：
> - ❌ **Git 未安装** —— 必须先做第 1 步
> - ❌ Git 身份未配置
> - ❌ 项目目录还不是 git 仓库
>
> 也就是说，下面五步你**全部都要做**。

---

## 第 0 步：注册 GitHub 账号（约 3 分钟）

1. 打开浏览器，访问 **https://github.com/signup**
2. 依次填写：
   - **Email**：你的邮箱（QQ 邮箱、163、Gmail 都行）
   - **Password**：至少 8 位，建议字母+数字
   - **Username**：**这个很重要，会成为你仓库网址的一部分**，比如填 `gaozekun`，
     那么仓库网址就是 `https://github.com/gaozekun/dsh-one-click-restart`
     （只能用字母、数字、连字符；不能有中文和空格）
3. 完成人机验证（拼图）
4. 收取邮箱里的 **8 位验证码**并填入
5. 后面的"个性化问卷"**全部可以跳过**（Skip personalization）

**✅ 验证**：登录后能看到 https://github.com 首页右上角是你的头像。

> 💡 如果 github.com 打不开：这是网络问题，不是你的操作问题。
> 中国大陆访问 GitHub 时常不稳定，可以稍后重试，或使用你惯用的网络工具。
> **注册账号这一步必须能打开网站**，否则先解决网络。

---

## 第 1 步：安装 Git for Windows（约 3 分钟）

Git 是一个命令行工具，`git` 命令需要它。

### 下载

访问 **https://git-scm.com/download/win**

页面会自动开始下载 64 位版本（文件名类似 `Git-2.xx.x-64-bit.exe`）。
如果没自动下载，点击 **"Click here to download manually"**。

### 安装

双击运行安装包。**安装向导里有很多页选项，全部保持默认，一路点 "Next" 到最后 "Install" 即可。**

只有一页值得确认：

- **"Adjusting your PATH environment"** 这一页
  → 保持默认的 **"Git from the command line and also from 3rd-party software"**

其余全部默认。

### 验证

安装完成后，**关闭所有已打开的终端窗口**（重要：PATH 需要新窗口才生效），
然后打开一个新的 PowerShell，输入：

```powershell
git --version
```

**✅ 验证**：应该输出类似 `git version 2.47.0.windows.1`。

如果提示"无法识别 git"，说明 PATH 没生效——**重启电脑**即可解决。

---

## 第 2 步：配置 Git 身份（约 1 分钟）

Git 需要知道"提交是谁做的"。在 PowerShell 里执行（**把两处内容换成你自己的**）：

```powershell
git config --global user.name "你的名字或昵称"
git config --global user.email "你注册GitHub用的邮箱"
git config --global init.defaultBranch main
```

例如：

```powershell
git config --global user.name "gaozekun"
git config --global user.email "123456@qq.com"
git config --global init.defaultBranch main
```

**✅ 验证**：

```powershell
git config --global user.name
git config --global user.email
```

应该回显你刚填的内容。

> ⚠️ 邮箱建议**与 GitHub 账号一致**，这样提交记录才会正确关联到你的账号。

---

## 第 3 步：在 GitHub 上建一个空仓库（约 2 分钟）

1. 登录 GitHub，点击右上角 **`+`** → **New repository**
   （或直接访问 https://github.com/new）
2. 填写：
   - **Repository name**：`dsh-one-click-restart`（**必须完全一致**，因为 package.json 里写的是这个名字）
   - **Description**：可填
     `One-click restart for DeepSeek Harness — restart even when the host is frozen, then resume interrupted work.`
   - **Public / Private**：选 **Public**（公开，别人才能看到）
3. ⚠️ **下面的三个复选框全部不要勾选**：
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
   
   **原因**：你本地已经有这些文件了。如果这里勾了，GitHub 会先建一个提交，
   你推送时就会遇到"拒绝推送（non-fast-forward）"的错误——这是新手最常踩的坑。
4. 点击 **Create repository**

**✅ 验证**：跳转后的页面显示 "…or push an existing repository from the command line"，
并给出两行 `git remote add origin ...` 命令。**这个页面先别关**，第 4 步要用里面的网址。

---

## 第 4 步：本地初始化并推送（约 3 分钟）

打开 PowerShell，**逐段执行**。

### 4.1 进入项目目录

```powershell
cd "E:\xiazai\DS\work area\dsh-one-click-restart"
```

**✅ 验证**：`ls` 应该能看到 `package.json`、`src`、`watchdog` 等。

### 4.2 初始化仓库并做第一次提交

```powershell
git init
git add -A
git commit -m "feat: one-click restart for DeepSeek Harness"
```

**✅ 验证**：最后一行输出会列出被提交的文件数量（应该是几十个），
且**不包含 `node_modules`**（`.gitignore` 已排除它）。

> 如果提示 `nothing to commit`，说明 `git add -A` 没生效，重跑一次。
>
> 如果提示要设置身份，回到第 2 步。

### 4.3 关联远程仓库

**`<你的用户名>` 换成第 0 步注册的用户名**：

```powershell
git remote add origin https://github.com/<你的用户名>/dsh-one-click-restart.git
git branch -M main
```

**✅ 验证**：

```powershell
git remote -v
```

应该输出两行，包含你刚填的网址。

### 4.4 推送

```powershell
git push -u origin main
```

**这一步会弹出登录窗口**：

- 会弹出 **"Sign in to GitHub.com"** 的浏览器窗口 → 点击 **Continue** → 授权
  （Git for Windows 自带的 Git Credential Manager 会处理，**这是最简单的方式**）
- 或者弹出终端里要求输入用户名密码：
  - Username：你的 GitHub 用户名
  - Password：⚠️ **不是你的登录密码！** 必须用 **Personal Access Token**
    （见下方"常见问题"第 2 条）

**✅ 验证**：输出结尾类似

```
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

现在刷新 GitHub 页面——**文件已经在上面了**。

---

## 第 5 步（可选）：发布一个 Release，把成品包附上

这样别人可以直接下载 `.tgz`，不用自己构建。

### 5.1 打标签并推送

```powershell
cd "E:\xiazai\DS\work area\dsh-one-click-restart"
git tag v1.0.0
git push origin v1.0.0
```

### 5.2 在网页上创建 Release

1. 打开你的仓库页面
2. 右侧栏点击 **Releases** → **Create a new release**
3. **Choose a tag**：选择 `v1.0.0`
4. **Release title**：`v1.0.0`
5. **Describe this release**：可以粘贴 `SHARE.md` 里的"短介绍"
6. **Attach binaries**：把 `dsh-one-click-restart-1.0.0.tgz` **拖进虚线框**
7. 点击 **Publish release**

**✅ 验证**：仓库首页右侧出现 "Releases v1.0.0"，点进去能下载到 `.tgz`。

---

## 常见问题

### 1. `git push` 卡住不动 / 连接超时

网络问题。可以试试：

```powershell
git config --global http.proxy http://127.0.0.1:7890   # 换成你自己的代理端口
```

取消代理：

```powershell
git config --global --unset http.proxy
```

### 2. 提示 `Support for password authentication was removed`

**GitHub 早在 2021 年就禁用密码推送了。** 需要创建 **Personal Access Token**：

1. 打开 https://github.com/settings/tokens
2. **Generate new token** → **Generate new token (classic)**
3. **Note**：随便填，比如 `local-push`
4. **Expiration**：选 90 days（或 No expiration）
5. **勾选权限**：至少勾 **`repo`**（第一个大项，勾它会把子项都选上）
6. 拉到底点 **Generate token**
7. **立刻复制那串 `ghp_...`**（⚠️ **离开页面后就再也看不到了**）

然后在 `git push` 要求输入密码时，**粘贴这个 token**（不是登录密码）。
需要输入用户名时填你的 GitHub 用户名。

之后 Windows 会记住它，不用每次输。

### 3. 推送被拒绝：`failed to push some refs` / `non-fast-forward`

原因：第 3 步建仓库时**勾选了 README / .gitignore / license**，导致远程已有提交。

**最简单的解法**：删掉那个 GitHub 仓库，重新建一个**什么都不勾选**的空仓库（第 3 步），再推送。

**或者**强制覆盖（⚠️ 会丢弃远程那个自动生成的提交）：

```powershell
git push -u origin main --force
```

### 4. `fatal: not a git repository`

说明当前目录不对。先执行 `cd "E:\xiazai\DS\work area\dsh-one-click-restart"`。

### 5. 想把项目里的名字换成自己的

发布前修改 `package.json`，把三处 `CHANGE-ME` 换成你的 GitHub 用户名：

```json
"repository": { "url": "git+https://github.com/CHANGE-ME/dsh-one-click-restart.git" },
"homepage":   "https://github.com/CHANGE-ME/dsh-one-click-restart#readme",
"bugs":       { "url": "https://github.com/CHANGE-ME/dsh-one-click-restart/issues" }
```

改完记得再提交一次：

```powershell
git add -A
git commit -m "docs: point repository metadata at the real URL"
git push
```

---

## 做完后的检查清单

- [ ] GitHub 账号注册成功并能登录
- [ ] `git --version` 有输出
- [ ] `git config --global user.name` / `user.email` 都有值
- [ ] GitHub 上有一个 **空的** `dsh-one-click-restart` 仓库
- [ ] `git push` 成功，网页上能看到 `src/`、`watchdog/`、`README.zh.md` 等
- [ ] 网页上**看不到** `node_modules`
- [ ] （可选）Release 里能下载到 `dsh-one-click-restart-1.0.0.tgz`

全部打勾，就完成了。
