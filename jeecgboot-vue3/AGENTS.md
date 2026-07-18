# 前端代码

## 技术栈

- Vue 3.5
- TypeScript 5.9
- Vite 6
- Ant Design Vue 4.2
- Pinia 2.1
- dayjs
- axios

## 前端业务模块

**目录：jeecgboot-vue3/src/views/business**

- notice：通知管理

## 表单扩展组件

**目录：src/custom/components**
**支持用在 useForm 的 schemas 中**

## 常用工具

- `/@/custom/function`：工具方法
- `/@/custom/reactivity`：响应式数据类型
- `/@/custom/composables/useSelectUserByDepartmentModal`：选人(函数调用)
- `/@/api/common/api`：常用请求
- `/@/store/modules/user`：当前登录用户信息

## 执行元语

### 理解

1. 阅读`业务文档.md`(根据`后端目录`下的`AGENTS.md`确认位置)
2. 阅读对应`前端业务模块`源码
3. 使用`mariadb_jeecgboot`mcp查看相关表结构及数据

### 更新文档

**前提**：对应`后端业务模块`根目录下存在`业务文档.md`(根据`后端目录`下的`AGENTS.md`确认位置)

- 按需修改`业务文档.md`
- 文档与代码不一致时指出并请用户确认，不擅自按文档改代码或按代码改文档

### 更新AGENTS.md

**仅必要时更新**

- 按需修改`AGENTS.md`(位于`jeecgboot-vue3`目录)
- 保持现有格式，表述精简

### 生成基础代码

- 执行`esno scripts/code-generator/index.ts help new-module`查看所有选项
- 根据业务生成命令并执行，如`esno scripts/code-generator/index.ts new-module -v base/test -n 测试 -t table -m cancel -y --no-interactive`

### 编码

1. 使用`jeecgboot-front-dev`skill编写代码
2. 按最小改动实现，并逐项检查`代码检查清单`

### 测试

- 本地服务已启动 `http://localhost:3100`
- 账号：tgx 密码：123456
- 导航到对应模块页面，完成端到端测试（覆盖所有情况）

## 典型工作流

**使用`执行元语`组织工作流**

### 开发新模块

1. 理解
2. 生成基础代码
3. 编码
4. 测试
5. 更新AGENTS.md

### 修改现有模块

1. 理解
2. 编码
3. 测试
4. 更新文档
5. 更新AGENTS.md

## 代码检查清单

- [ ] 所有代码符合`技术栈`
- [ ] 不存在与`常用工具`功能重叠的代码
- [ ] 所有通用工具型代码已封装到`常用工具`