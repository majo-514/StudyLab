# StudyLab

StudyLab 是用于专业课程复习的个人学习网站。固体物理包含六章、专项作业、总复习、习题与公式速查，同时保留数学泰勒展开专题。网站使用 Astro、MDX、React、TypeScript 与 KaTeX 静态生成，课程正文和公式无需等待客户端脚本加载。

公开版只包含本站编写的章节简介和原创物理实验。上线后，访问地址以 GitHub 仓库 **Settings → Pages** 显示的 URL 为准。课程原稿及题图仅在含本地资料的版本中使用。

## 在 Windows 上运行

安装 Node.js 24，在 PowerShell 中执行。若已有 pnpm 11.25.0，可跳过安装 pnpm 的命令。

```powershell
cd D:\Studylab
npm.cmd install --global pnpm@11.25.0
pnpm.cmd install --frozen-lockfile
$env:ASTRO_TELEMETRY_DISABLED = '1'
pnpm.cmd dev --host 127.0.0.1 --port 4322
```

打开 [本地 StudyLab](http://127.0.0.1:4322/)。保留终端窗口，按 Ctrl+C 停止。如果端口已被占用，先停止旧进程。一直使用同一个浏览器和地址可以继续使用原有学习记录。

## 学习与备份

- 从课程页进入所需章节，使用目录跳到目标知识点。章节底部提供相关资料、实验与相邻章节。
- 题库按章节、题型、掌握程度及错题或收藏筛选。随机抽题使用当前结果。打开习题后先读题，再展开解析。原稿没有独立题干的题以原题标题作为练习提示，完整原文在解析内。
- 章节和单题都能记笔记、标记掌握状态和添加书签。错题和收藏在习题页编辑。主页列出最近打开的条目。
- 「学习记录 → 备份与恢复」可以导出 JSON。导入时先预览，随后把缺少的记录合并进当前数据，同 ID 的已编辑内容保留。备份含个人数据，请保存在私有位置。清理浏览器数据前请先备份。
- 学习记录按浏览器与网址保存在本地，公开版和本地版的数据需要手动迁移。

## 目录与课程导入

| 目录或文件 | 用途 |
| --- | --- |
| `materials/` | 本地原稿、原图、资料包说明、旧项目快照 |
| `courses.json` | 课程及章节导航，使用固定章节 ID |
| `scripts/import-materials.mjs` | 导入文件映射、题目拆分和来源记录 |
| `examples/` | 公开构建使用的原创章节简介 |
| `src/pages/` | 课程、章节、训练、搜索和个人记录路由 |
| `src/lib/physics.ts` 与 `src/lib/labs.ts` | 物理计算与实验注册 |
| `src/components/` | 响应式实验、题库和学习记录 |
| `.study-cache/import-report.json` | 本地生成的逐文件处理清单 |
| `tests/` | 计算和学习数据行为测试 |

固体物理的原始资料路径是 `materials/solid-state physics/`。修改原稿后重新启动开发服务器即可重新导入。导入清单列出课程正文、题目、开发说明、模板及图片的处理结果。依赖目录和旧构建缓存排除在清单之外。

新增学科时，在 `materials/` 新建课程目录，在 `courses.json` 注册课程、显示名、相对目录和固定章节 ID。新课程可直接使用如下 Markdown 头部。章首页的 id 与 chapter 相同，专题与习题使用各自的 id。题目用 `## 题目` 和 `## 展开推导与答案` 分隔，已使用的 ID 应保留以延续网址和笔记。

```yaml
---
id: example-chapter-01
chapter: example-chapter-01
kind: chapter
---
```

正文第一行一级标题作为显示标题。其他 kind 可填 topic、formula 或 problem。固体物理资料包中的旧格式仍通过导入映射接入。

正文采用 UTF-8 Markdown。行内公式用单美元符号，独立公式用双美元符号并独占一个块。图像引用使用相对路径，题目、提示、解法、勘误和出处分段标明。新实验先在计算层写带明确单位的纯函数和边界测试，再在实验注册表中声明参数和输出，图表按计算结果绘制。

## 构建、检查与发布

```powershell
pnpm.cmd check
pnpm.cmd test
pnpm.cmd build
pnpm.cmd verify
```

确认本地测试通过后，可验证 GitHub Pages 子路径。公开构建由显式开关阻止课程资料进入产物。以下命令会将生成目录切换为公开版。

```powershell
$env:STUDYLAB_PUBLIC = '1'
$env:STUDYLAB_BASE = '/StudyLab'
pnpm.cmd build
pnpm.cmd verify
```

GitHub Pages 的发布源选择 **GitHub Actions**。仓库的工作流读取 Pages 配置提供的站点子路径，依次安装锁定依赖、检查、测试、构建和发布。根目录路径与子路径是两种构建配置，验证时使用同一组环境变量。[GitHub Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 内容来源与许可

六章学习笔记、总复习、专项原题截图和课件插图来自用户提供的学习资料包。文件中有课件整理、课堂题与课件截取。公开权限待逐文件核实。公开构建只收录 `examples/` 中本站编写的章首内容和项目原创代码，第三方依赖遵循各自许可。项目代码和原创文字目前未指定额外的开源许可。详见 [权属说明](RIGHTS.md)。

部分实验是资料所列模型的简化子集，例如近自由电子只展示局部两态模型。待实现能力和科学差异见 [验收记录](docs/acceptance.md)。
