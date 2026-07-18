# 后端代码

## 技术栈

- JDK 17
- Spring Boot 3.5.5
- MyBatis-Plus 3.5.12
- MariaDB 11
- Sa-Token 1.44.0
- Hutool 5.8.25

## 后端业务模块

**目录：jeecg-boot/jeecg-boot-module/jeecg-module-business/src/main/java/org/jeecg/modules/business**
**包：org.jeecg.modules.business**

- notice：通知管理

## 常用工具类

**目录：jeecg-boot/jeecg-boot-base-core/src/main/java/org/jeecg/common/util**
**包：org.jeecg.common.util**
**以下仅列出目录下部分常用工具类**

- LoginUserUtils：当前登录用户信息
- ExcelUtil：Excel导入导出
- SpelUtil：Spring EL执行
- SerialNoUtil：编号生成(自定义前缀+8位日期+3位自增数)

## 执行元语

### 理解

1. 阅读`业务文档.md`(位于对应`后端业务模块`根目录)
2. 阅读对应`后端业务模块`源码
3. 使用`mariadb_jeecgboot`mcp查看相关表结构及数据

### 编写文档/更新文档

- 使用`jeecgboot-dev-doc`skill编写`业务文档.md`(位于对应`后端业务模块`根目录)
- 如果是`更新文档`：只能按需修改

### 更新AGENTS.md

**仅必要时更新**

- 按需修改`AGENTS.md`(位于`jeecg-boot`目录)
- 保持现有格式，表述精简

### 编码

1. 使用`jeecgboot-back-dev`skill编写代码
2. 逐项检查`代码检查清单`

### 编译

仅编译有代码变更的模块

## 典型工作流

**使用`执行元语`组织工作流**

### 开发新模块

1. 编写文档
2. 编码
3. 编译
4. 更新AGENTS.md

### 修改现有模块

1. 理解
2. 编码
3. 编译
4. 更新文档
5. 更新AGENTS.md

## 注意事项

- 本地服务已通过 jRebel 启动（自动热重载）`http://localhost:8080/jeecg-boot`
- 修改 xml 后必须要求用户重启服务（修改才会生效）

## 代码检查清单

- [ ] 所有代码符合`技术栈`
- [ ] 所有返回值为`Result<Entity>`/`Result<List<Entity>>`的接口包含`@AutoDict`
- [ ] 所有 Entity 的`List<Entity>`字段包含`@NestedDict`
- [ ] 所有包含动态参数的接口日志，通过`@AutoLog(el = "Spring-EL表达式")`实现
- [ ] 不存在与`常用工具类`功能重叠的代码
- [ ] 所有通用工具型代码已封装到`常用工具类`