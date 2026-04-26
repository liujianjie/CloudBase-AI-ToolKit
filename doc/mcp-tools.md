import ParameterTable from '../../api-reference/components/ApiContainer';

# MCP 工具

当前包含 36 个工具，按功能分组如下。

源数据: [tools.json](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit/blob/main/scripts/tools.json)

---

## 工具总览

### 认证与登录

- [`auth`](#auth)

### 环境管理

- [`envQuery`](#envquery)
- [`envDomainManagement`](#envdomainmanagement)

### NoSQL 数据库

- [`readNoSqlDatabaseStructure`](#readnosqldatabasestructure)
- [`writeNoSqlDatabaseStructure`](#writenosqldatabasestructure)
- [`readNoSqlDatabaseContent`](#readnosqldatabasecontent)
- [`writeNoSqlDatabaseContent`](#writenosqldatabasecontent)

### MySQL 数据库

- [`querySqlDatabase`](#querysqldatabase)
- [`manageSqlDatabase`](#managesqldatabase)

### 数据模型

- [`manageDataModel`](#managedatamodel)
- [`modifyDataModel`](#modifydatamodel)

### 云函数

- [`queryFunctions`](#queryfunctions)
- [`manageFunctions`](#managefunctions)

### 静态托管

- [`uploadFiles`](#uploadfiles)
- [`deleteFiles`](#deletefiles)
- [`findFiles`](#findfiles)

### 域名管理

- [`domainManagement`](#domainmanagement)

### 云存储

- [`queryStorage`](#querystorage)
- [`manageStorage`](#managestorage)

### 模板与文件

- [`downloadTemplate`](#downloadtemplate)
- [`downloadRemoteFile`](#downloadremotefile)

### 搜索与知识库

- [`searchWeb`](#searchweb)
- [`searchKnowledgeBase`](#searchknowledgebase)

### 云托管

- [`queryCloudRun`](#querycloudrun)
- [`manageCloudRun`](#managecloudrun)

### 网关

- [`queryGateway`](#querygateway)
- [`manageGateway`](#managegateway)

### 应用认证

- [`queryAppAuth`](#queryappauth)
- [`manageAppAuth`](#manageappauth)

### 权限管理

- [`queryPermissions`](#querypermissions)
- [`managePermissions`](#managepermissions)

### 日志

- [`queryLogs`](#querylogs)

### AI Agent

- [`queryAgents`](#queryagents)
- [`manageAgents`](#manageagents)

### 激励计划

- [`activateInviteCode`](#activateinvitecode)

### 云 API

- [`callCloudApi`](#callcloudapi)

---

## 云端 MCP 配置说明


### 环境变量配置

使用云端 MCP 需要配置以下环境变量：

| 环境变量 | 说明 | 获取方式 |
|---------|------|---------|
| `TENCENTCLOUD_SECRETID` | 腾讯云 SecretId | [获取腾讯云 API 密钥](https://console.cloud.tencent.com/cam/capi) |
| `TENCENTCLOUD_SECRETKEY` | 腾讯云 SecretKey | [获取腾讯云 API 密钥](https://console.cloud.tencent.com/cam/capi) |
| `TENCENTCLOUD_SESSIONTOKEN` | 非必填，腾讯云临时密钥 Token（可选） | 仅在使用临时密钥时需要，可通过 [STS 服务](https://console.cloud.tencent.com/cam/capi) 获取 |
| `CLOUDBASE_ENV_ID` | 云开发环境 ID | [获取云开发环境 ID](https://tcb.cloud.tencent.com/dev) |

## 详细规格

### `auth`
CloudBase 登录与环境绑定工具。支持查询登录状态、发起登录、绑定/切换环境、获取临时凭证和退出登录。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      description: `动作：status=查询状态，start_auth=发起登录，set_env=绑定环境(传envId)，logout=退出登录 可填写的值: "status", "start_auth", "set_env", "logout", "get_temp_credentials"`,
    },
    {
      name: "authMode",
      type: "string",
      description: `认证模式：device=设备码授权，web=浏览器回调授权 可填写的值: "device", "web"`,
    },
    {
      name: "oauthEndpoint",
      type: "string",
      description: `高级可选：自定义 device-code 登录 endpoint。配置后 oauthCustom 默认按 true 处理`,
    },
    {
      name: "clientId",
      type: "string",
      description: `高级可选：自定义 device-code 登录 client_id，不传则使用默认值`,
    },
    {
      name: "oauthCustom",
      type: "boolean",
      description: `高级可选：自定义 endpoint 返回格式开关。未配置 endpoint 时默认 false；配置 endpoint 后默认 true，且不能设为 false`,
    },
    {
      name: "envId",
      type: "string",
      description: `环境ID(CloudBase 环境唯一标识)，绑定后工具将操作该环境。action=set_env 时必填`,
    },
    {
      name: "confirm",
      type: "string",
      description: `action=logout 时确认操作，传 yes 可填写的值: const "yes"`,
    },
    {
      name: "reveal",
      type: "boolean",
      description: `action=get_temp_credentials 时可选。true=返回明文临时密钥；默认 false 仅返回脱敏结果`,
    }
  ]}
/>

---

### `envQuery`
CloudBase 环境信息查询工具。支持查询环境列表、环境详情、安全域名和静态网站托管配置。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `查询类型：list=环境列表/摘要筛选（即使传 envId 也只返回 EnvId、Alias、Status、EnvType、Region、PackageId、PackageName、IsDefault，不支持 expiry），info=当前环境详细信息（详情中可查看更完整资源字段），domains=安全域名列表，hosting=静态网站托管配置 可填写的值: "list", "info", "domains", "hosting"`,
    },
    {
      name: "alias",
      type: "string",
      description: `按环境别名筛选。action=list 时可选`,
    },
    {
      name: "aliasExact",
      type: "boolean",
      description: `按环境别名精确筛选。action=list 时可选；与 alias 配合使用`,
    },
    {
      name: "envId",
      type: "string",
      description: `按环境 ID 精确筛选。action=list 时可选；注意 list + envId 仍只返回摘要，如需该环境详情请改用 action=info`,
    },
    {
      name: "limit",
      type: "integer",
      description: `返回数量上限。action=list 时可选`,
    },
    {
      name: "offset",
      type: "integer",
      description: `分页偏移。action=list 时可选`,
    },
    {
      name: "fields",
      type: "array of string",
      description: `返回字段白名单。仅支持 EnvId、Alias、Status、EnvType、Region、PackageId、PackageName、IsDefault。action=list 时可选`,
    }
  ]}
/>

---

### `envDomainManagement`
CloudBase 安全域名管理工具。支持添加和删除环境的安全域名，用于本地开发或自定义域名的跨域访问。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `操作类型：create=添加域名，delete=删除域名 可填写的值: "create", "delete"`,
    },
    {
      name: "domains",
      type: "array of string",
      required: true,
      description: `安全域名数组`,
    }
  ]}
/>

---

### `readNoSqlDatabaseStructure`
CloudBase 文档数据库（NoSQL）结构查询工具。支持列出集合、查看集合详情、列出索引和检查索引是否存在。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `listCollections: 列出集合列表 describeCollection: 描述集合详情（会返回索引摘要） checkCollection: 检查集合是否存在 listIndexes: 列出指定集合的索引列表 checkIndex: 检查指定索引是否存在 可填写的值: "listCollections", "describeCollection", "checkCollection", "listIndexes", "checkIndex"`,
    },
    {
      name: "limit",
      type: "number",
      description: `返回数量限制(listCollections 操作时可选)`,
    },
    {
      name: "offset",
      type: "number",
      description: `偏移量(listCollections 操作时可选)`,
    },
    {
      name: "collectionName",
      type: "string",
      description: `集合名称(describeCollection、listIndexes、checkIndex 操作时必填)`,
    },
    {
      name: "indexName",
      type: "string",
      description: `索引名称(checkIndex 操作时必填)`,
    }
  ]}
/>

---

### `writeNoSqlDatabaseStructure`
CloudBase 文档数据库（NoSQL）结构管理工具。支持创建/删除集合，以及添加/删除索引。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `createCollection: 创建集合 updateCollection: 更新集合配置；添加索引请传 updateOptions.CreateIndexes，删除索引请传 updateOptions.DropIndexes deleteCollection: 删除集合 可填写的值: "createCollection", "updateCollection", "deleteCollection"`,
    },
    {
      name: "collectionName",
      type: "string",
      required: true,
      description: `集合名称`,
    },
    {
      name: "updateOptions",
      type: "object",
      description: `更新选项(updateCollection 时使用)。CreateIndexes 用于添加索引，DropIndexes 用于删除索引。`,
      children: [
        {
          name: "CreateIndexes",
          type: "array of object",
          description: `要添加的索引列表`,
          children: [
            {
              name: "IndexName",
              type: "string",
              required: true,
              description: `要创建的索引名称`,
            },
            {
              name: "MgoKeySchema",
              type: "object",
              required: true,
              description: `待创建索引的字段与约束配置`,
              children: [
                {
                  name: "MgoIsUnique",
                  type: "boolean",
                  required: true,
                  description: `是否唯一索引`,
                },
                {
                  name: "MgoIndexKeys",
                  type: "array of object",
                  required: true,
                  description: `索引字段列表，支持单字段或复合索引`,
                  children: [
                    {
                      name: "Name",
                      type: "string",
                      required: true,
                      description: `索引字段名`,
                    },
                    {
                      name: "Direction",
                      type: "string",
                      required: true,
                      description: `索引方向，通常 1 表示升序，-1 表示降序`,
                    }
                  ],
                }
              ],
            }
          ],
        },
        {
          name: "DropIndexes",
          type: "array of object",
          description: `要删除的索引列表`,
          children: [
            {
              name: "IndexName",
              type: "string",
              required: true,
              description: `要删除的索引名称`,
            }
          ],
        }
      ],
    }
  ]}
/>

---

### `readNoSqlDatabaseContent`
CloudBase 文档数据库（NoSQL）数据查询工具。支持按条件查询文档、字段投影、排序和分页。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "collectionName",
      type: "string",
      required: true,
      description: `集合名称`,
    },
    {
      name: "instanceId",
      type: "string",
      description: `可选：显式指定数据库实例ID；未传时会自动解析并缓存`,
    },
    {
      name: "query",
      type: "union",
      description: `查询条件(对象或字符串,推荐对象)`,
    },
    {
      name: "projection",
      type: "union",
      description: `返回字段投影(对象或字符串,推荐对象)`,
    },
    {
      name: "sort",
      type: "union",
      description: `排序条件，仅支持数组 [{"key":"createdAt","direction":-1}] 或对应 JSON 字符串。`,
    },
    {
      name: "limit",
      type: "number",
      description: `返回数量限制`,
    },
    {
      name: "offset",
      type: "number",
      description: `跳过的记录数`,
    }
  ]}
/>

---

### `writeNoSqlDatabaseContent`
CloudBase 文档数据库（NoSQL）数据管理工具。支持插入、更新和删除文档。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `insert: 插入数据（新增文档） update: 更新数据 delete: 删除数据 可填写的值: "insert", "update", "delete"`,
    },
    {
      name: "collectionName",
      type: "string",
      required: true,
      description: `集合名称`,
    },
    {
      name: "instanceId",
      type: "string",
      description: `可选：显式指定数据库实例ID；未传时会自动解析并缓存`,
    },
    {
      name: "documents",
      type: "array of object",
      description: `要插入的文档对象数组,每个文档都是对象(insert 操作必填)`,
    },
    {
      name: "query",
      type: "union",
      description: `查询条件(对象或字符串,推荐对象)(update/delete 操作必填)`,
    },
    {
      name: "update",
      type: "union",
      description: `更新内容(对象或字符串,推荐对象)(update 操作必填)。按 MongoDB 更新语义传入 MgoUpdate：部分更新请使用 \`$set\`、\`$inc\`、\`$unset\`、\`$push\` 等操作符，例如使用 \`$set\` 更新 \`status\`；不要直接传“字段到值的普通对象”，否则可能替换整条文档。更新嵌套字段时必须使用点号路径，例如通过 \`$set\` 更新 \`address.city\`；不要把整个 \`address\` 对象作为 \`$set\` 的值传入，否则会替换整个 \`address\` 对象。`,
    },
    {
      name: "isMulti",
      type: "boolean",
      description: `是否更新多条记录(update/delete 操作可选)`,
    },
    {
      name: "upsert",
      type: "boolean",
      description: `是否在不存在时插入(update 操作可选)`,
    }
  ]}
/>

---

### `querySqlDatabase`
CloudBase MySQL 数据库查询工具。支持执行只读 SQL、查询实例信息、创建结果和任务状态。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `runQuery=execute read-only SQL; describeCreateResult=query CreateMySQL result; describeTaskStatus=query MySQL task status; getInstanceInfo=get current SQL instance context 可填写的值: "runQuery", "describeCreateResult", "describeTaskStatus", "getInstanceInfo"`,
    },
    {
      name: "sql",
      type: "string",
      description: `Read-only SQL used by action=runQuery`,
    },
    {
      name: "request",
      type: "object",
      description: `Official request payload used by describeCreateResult/describeTaskStatus`,
    },
    {
      name: "dbInstance",
      type: "object",
      description: `Optional SQL database instance context for runQuery`,
      children: [
        {
          name: "instanceId",
          type: "string",
        },
        {
          name: "schema",
          type: "string",
        }
      ],
    }
  ]}
/>

---

### `manageSqlDatabase`
CloudBase MySQL 数据库管理工具。支持 MySQL 实例开通/销毁、执行写 SQL/DDL 和初始化 Schema。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `provisionMySQL=create MySQL instance; destroyMySQL=destroy MySQL instance; runStatement=execute write SQL or DDL; initializeSchema=run ordered schema initialization statements 可填写的值: "provisionMySQL", "destroyMySQL", "runStatement", "initializeSchema"`,
    },
    {
      name: "confirm",
      type: "boolean",
      description: `Explicit confirmation required for action=provisionMySQL or action=destroyMySQL`,
    },
    {
      name: "sql",
      type: "string",
      description: `SQL statement used by action=runStatement`,
    },
    {
      name: "request",
      type: "object",
      description: `Official request payload used by action=provisionMySQL or action=destroyMySQL`,
    },
    {
      name: "statements",
      type: "array of string",
      description: `Ordered schema initialization SQL statements used by action=initializeSchema`,
    },
    {
      name: "requireReady",
      type: "boolean",
      description: `Whether initializeSchema should block until MySQL is confirmed ready. Defaults to true.`,
    },
    {
      name: "statusContext",
      type: "object",
      description: `Optional provisioning status requests used to confirm readiness before initializeSchema`,
      children: [
        {
          name: "createResultRequest",
          type: "object",
        },
        {
          name: "taskStatusRequest",
          type: "object",
        }
      ],
    },
    {
      name: "dbInstance",
      type: "object",
      description: `Optional SQL database instance context for runStatement/initializeSchema`,
      children: [
        {
          name: "instanceId",
          type: "string",
        },
        {
          name: "schema",
          type: "string",
        }
      ],
    }
  ]}
/>

---

### `manageDataModel`
CloudBase 数据模型查询工具。支持查询模型列表、模型详情和生成 SDK 使用文档。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `操作类型：get=查询单个模型（含Schema字段列表、格式、关联关系，需要提供 name 参数），list=获取模型列表（不含Schema，可选 names 参数过滤），docs=生成SDK使用文档（需要提供 name 参数） 可填写的值: "get", "list", "docs"`,
    },
    {
      name: "name",
      type: "string",
      description: `要查询的数据模型名称。当 action='get' 或 action='docs' 时，此参数为必填项，必须提供已存在的数据模型名称。可通过 action='list' 操作获取可用的模型名称列表`,
    },
    {
      name: "names",
      type: "array of string",
      description: `模型名称数组（list操作时可选，用于过滤）`,
    }
  ]}
/>

---

### `modifyDataModel`
CloudBase 数据模型创建工具。基于 Mermaid classDiagram 创建数据模型，支持自动发布。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "mermaidDiagram",
      type: "string",
      required: true,
      description: `Mermaid classDiagram代码，描述数据模型结构。 示例： classDiagram     class Student {         name: string <<姓名>>         age: number = 18 <<年龄>>         gender: x-enum = "男" <<性别>>         classId: string <<班级ID>>         identityId: string <<身份ID>>         course: Course[] <<课程>>         required() ["name"]         unique() ["name"]         enum_gender() ["男", "女"]         display_field() "name"     }     class Class {         className: string <<班级名称>>         display_field() "className"     }     class Course {         name: string <<课程名称>>         students: Student[] <<学生>>         display_field() "name"     }     class Identity {         number: string <<证件号码>>         display_field() "number"     }     %% 关联关系     Student "1" --> "1" Identity : studentId     Student "n" --> "1" Class : student2class     Student "n" --> "m" Course : course     Student "n" <-- "m" Course : students     %% 类的命名     note for Student "学生模型"     note for Class "班级模型"     note for Course "课程模型"     note for Identity "身份模型" `,
    },
    {
      name: "action",
      type: "string",
      description: `操作类型：create=创建新模型 可填写的值: "create"`,
    },
    {
      name: "publish",
      type: "boolean",
      description: `是否立即发布模型`,
    },
    {
      name: "dbInstanceType",
      type: "string",
      description: `数据库实例类型`,
    }
  ]}
/>

---

### `queryFunctions`
CloudBase 云函数查询工具。支持查询函数列表、详情、日志、层、触发器和代码下载地址。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `只读操作类型，例如 listFunctions、getFunctionDetail、listFunctionLogs 可填写的值: "listFunctions", "getFunctionDetail", "listFunctionLogs", "getFunctionLogDetail", "listFunctionLayers", "listLayers", "listLayerVersions", "getLayerVersionDetail", "listFunctionTriggers", "getFunctionDownloadUrl"`,
    },
    {
      name: "functionName",
      type: "string",
      description: `函数名称。函数相关 action 必填`,
    },
    {
      name: "limit",
      type: "number",
      description: `分页数量。列表类 action 可选`,
    },
    {
      name: "offset",
      type: "number",
      description: `分页偏移。列表类 action 可选`,
    },
    {
      name: "codeSecret",
      type: "string",
      description: `代码保护密钥`,
    },
    {
      name: "startTime",
      type: "string",
      description: `日志查询开始时间`,
    },
    {
      name: "endTime",
      type: "string",
      description: `日志查询结束时间`,
    },
    {
      name: "requestId",
      type: "string",
      description: `日志 requestId。获取日志详情时必填`,
    },
    {
      name: "qualifier",
      type: "string",
      description: `函数版本，日志查询时可选`,
    },
    {
      name: "runtime",
      type: "string",
      description: `层查询的运行时筛选`,
    },
    {
      name: "searchKey",
      type: "string",
      description: `层名称搜索关键字`,
    },
    {
      name: "layerName",
      type: "string",
      description: `层名称。层相关 action 必填`,
    },
    {
      name: "layerVersion",
      type: "number",
      description: `层版本号。获取层版本详情时必填`,
    }
  ]}
/>

---

### `manageFunctions`
CloudBase 云函数管理工具。支持创建函数、更新代码与配置、调用函数、管理触发器和层。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `写操作类型，例如 createFunction、invokeFunction、attachLayer 可填写的值: "createFunction", "updateFunctionCode", "updateFunctionConfig", "invokeFunction", "createFunctionTrigger", "deleteFunctionTrigger", "createLayerVersion", "deleteLayerVersion", "attachLayer", "detachLayer", "updateFunctionLayers"`,
    },
    {
      name: "func",
      type: "object",
      description: `createFunction 操作的函数配置`,
      children: [
        {
          name: "name",
          type: "string",
          required: true,
          description: `函数名称`,
        },
        {
          name: "type",
          type: "string",
          description: `函数类型 可填写的值: "Event", "HTTP"`,
        },
        {
          name: "protocolType",
          type: "string",
          description: `HTTP 云函数协议类型 可填写的值: "HTTP", "WS"`,
        },
        {
          name: "protocolParams",
          type: "object",
          children: [
            {
              name: "wsParams",
              type: "object",
              children: [
                {
                  name: "idleTimeOut",
                  type: "number",
                  description: `WebSocket 空闲超时时间（秒）`,
                }
              ],
            }
          ],
        },
        {
          name: "instanceConcurrencyConfig",
          type: "object",
          children: [
            {
              name: "dynamicEnabled",
              type: "boolean",
            },
            {
              name: "maxConcurrency",
              type: "number",
            }
          ],
        },
        {
          name: "timeout",
          type: "number",
          description: `函数超时时间`,
        },
        {
          name: "envVariables",
          type: "object",
          description: `环境变量`,
        },
        {
          name: "vpc",
          type: "object",
          description: `私有网络配置`,
          children: [
            {
              name: "vpcId",
              type: "string",
              required: true,
            },
            {
              name: "subnetId",
              type: "string",
              required: true,
            }
          ],
        },
        {
          name: "runtime",
          type: "string",
          description: `运行时环境。Event 函数支持多种运行时:   Nodejs: Nodejs20.19, Nodejs18.15, Nodejs16.13, Nodejs14.18, Nodejs12.16, Nodejs10.15, Nodejs8.9   Python: Python3.10, Python3.9, Python3.7, Python3.6, Python2.7   Php: Php8.0, Php7.4, Php7.2   Java: Java8, Java11   Golang: Golang1 推荐运行时:   Node.js: Nodejs18.15   Python: Python3.9   PHP: Php7.4   Java: Java11   Go: Golang1`,
        },
        {
          name: "triggers",
          type: "array of object",
          description: `触发器配置数组`,
          children: [
            {
              name: "name",
              type: "string",
              required: true,
              description: `触发器名称`,
            },
            {
              name: "type",
              type: "string",
              required: true,
              description: `触发器类型 可填写的值: "timer"`,
            },
            {
              name: "config",
              type: "string",
              required: true,
              description: `触发器配置。timer 必须使用 CloudBase 7 段 cron 格式：秒 分 时 日 月 星期 年。⚠️ 不支持标准 5 段 cron（如 */5 * * * * 是错误的）。正确示例：0 */5 * * * * *（每5分钟）、0 0 2 1 * * *（每月1号2点）、0 30 9 * * * *（每天9:30）`,
            }
          ],
        },
        {
          name: "handler",
          type: "string",
          description: `函数入口`,
        },
        {
          name: "ignore",
          type: "union",
          description: `忽略文件`,
        },
        {
          name: "isWaitInstall",
          type: "boolean",
          description: `是否等待依赖安装`,
        },
        {
          name: "layers",
          type: "array of object",
          description: `Layer 配置`,
          children: [
            {
              name: "name",
              type: "string",
              required: true,
            },
            {
              name: "version",
              type: "number",
              required: true,
            }
          ],
        }
      ],
    },
    {
      name: "functionRootPath",
      type: "string",
      description: `创建或更新函数代码时默认推荐的本地目录方式。函数根目录（父目录绝对路径）。本地应按 cloudfunctions/<functionName>/index.js 布局，此参数传 cloudfunctions 目录的绝对路径（如 /abs/path/cloudfunctions），不要传到函数名子目录。SDK 会自动拼接函数名子目录，无需预先压缩 zip 或 base64 编码。`,
    },
    {
      name: "force",
      type: "boolean",
      description: `createFunction 时是否覆盖`,
    },
    {
      name: "functionName",
      type: "string",
      description: `函数名称。大多数 action 使用该字段作为统一目标`,
    },
    {
      name: "zipFile",
      type: "string",
      description: `仅兼容特殊场景：预先准备好的代码包 base64 编码。普通 createFunction/updateFunctionCode 默认不要先压缩 zip，优先使用 functionRootPath。`,
    },
    {
      name: "handler",
      type: "string",
      description: `函数入口`,
    },
    {
      name: "timeout",
      type: "number",
      description: `配置更新时的超时时间`,
    },
    {
      name: "envVariables",
      type: "object",
      description: `配置更新时要合并的环境变量`,
    },
    {
      name: "vpc",
      type: "unknown",
      description: `配置更新时的 VPC 信息`,
    },
    {
      name: "params",
      type: "object",
      description: `invokeFunction 的调用参数`,
    },
    {
      name: "triggers",
      type: "array of unknown",
      description: `createFunctionTrigger 的触发器列表`,
    },
    {
      name: "triggerName",
      type: "string",
      description: `deleteFunctionTrigger 的目标触发器名称`,
    },
    {
      name: "layerName",
      type: "string",
      description: `层名称`,
    },
    {
      name: "layerVersion",
      type: "number",
      description: `层版本号`,
    },
    {
      name: "contentPath",
      type: "string",
      description: `层内容路径，可为目录或 ZIP 文件`,
    },
    {
      name: "base64Content",
      type: "string",
      description: `层内容的 base64 编码`,
    },
    {
      name: "runtimes",
      type: "array of string",
      description: `层适用的运行时列表`,
    },
    {
      name: "description",
      type: "string",
      description: `层版本描述`,
    },
    {
      name: "licenseInfo",
      type: "string",
      description: `层许可证信息`,
    },
    {
      name: "layers",
      type: "array of object",
      description: `updateFunctionLayers 的目标层列表，顺序即最终顺序`,
      children: [
        {
          name: "layerName",
          type: "string",
          required: true,
          description: `层名称`,
        },
        {
          name: "layerVersion",
          type: "number",
          required: true,
          description: `层版本号`,
        }
      ],
    },
    {
      name: "codeSecret",
      type: "string",
      description: `层绑定时的代码保护密钥`,
    },
    {
      name: "confirm",
      type: "boolean",
      description: `危险操作确认开关`,
    }
  ]}
/>

---

### `uploadFiles`
CloudBase 静态托管文件上传工具。支持上传本地文件或目录到静态网站托管。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "localPath",
      type: "string",
      description: `本地文件或文件夹路径，需要是绝对路径，例如 /tmp/files/data.txt。`,
    },
    {
      name: "cloudPath",
      type: "string",
      description: `静态托管云端文件或文件夹路径，例如 files/data.txt。若部署到子路径，请同时检查构建配置中的 publicPath、base、assetPrefix 等是否为相对路径。云存储对象路径请改用 manageStorage。`,
    },
    {
      name: "files",
      type: "array of object",
      description: `多文件上传配置`,
      children: [
        {
          name: "localPath",
          type: "string",
          required: true,
        },
        {
          name: "cloudPath",
          type: "string",
          required: true,
        }
      ],
    },
    {
      name: "ignore",
      type: "union",
      description: `忽略文件模式`,
    }
  ]}
/>

---

### `deleteFiles`
CloudBase 静态托管文件删除工具。支持删除静态网站托管中的文件或目录。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "cloudPath",
      type: "string",
      required: true,
      description: `云端文件或文件夹路径`,
    },
    {
      name: "isDir",
      type: "boolean",
      description: `是否为文件夹`,
    }
  ]}
/>

---

### `findFiles`
CloudBase 静态托管文件查询工具。支持按前缀搜索静态网站托管中的文件。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "prefix",
      type: "string",
      required: true,
      description: `匹配前缀`,
    },
    {
      name: "marker",
      type: "string",
      description: `起始对象键标记`,
    },
    {
      name: "maxKeys",
      type: "number",
      description: `单次返回最大条目数`,
    }
  ]}
/>

---

### `domainManagement`
CloudBase 域名管理工具。支持绑定、解绑、查询和修改域名配置。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `操作类型: create=绑定域名, delete=解绑域名, check=查询域名配置, modify=修改域名配置 可填写的值: "create", "delete", "check", "modify"`,
    },
    {
      name: "domain",
      type: "string",
      description: `域名`,
    },
    {
      name: "certId",
      type: "string",
      description: `证书ID（绑定域名时必需）`,
    },
    {
      name: "domains",
      type: "array of string",
      description: `域名列表（查询配置时使用）`,
    },
    {
      name: "domainId",
      type: "number",
      description: `域名ID（修改配置时必需）`,
    },
    {
      name: "domainConfig",
      type: "object",
      description: `域名配置（修改配置时使用）`,
      children: [
        {
          name: "Refer",
          type: "object",
          children: [
            {
              name: "Switch",
              type: "string",
              required: true,
            },
            {
              name: "RefererRules",
              type: "array of object",
              children: [
                {
                  name: "RefererType",
                  type: "string",
                  required: true,
                },
                {
                  name: "Referers",
                  type: "array of string",
                  required: true,
                },
                {
                  name: "AllowEmpty",
                  type: "boolean",
                  required: true,
                }
              ],
            }
          ],
        },
        {
          name: "Cache",
          type: "array of object",
          children: [
            {
              name: "RuleType",
              type: "string",
              required: true,
            },
            {
              name: "RuleValue",
              type: "string",
              required: true,
            },
            {
              name: "CacheTtl",
              type: "number",
              required: true,
            }
          ],
        },
        {
          name: "IpFilter",
          type: "object",
          children: [
            {
              name: "Switch",
              type: "string",
              required: true,
            },
            {
              name: "FilterType",
              type: "string",
            },
            {
              name: "Filters",
              type: "array of string",
            }
          ],
        },
        {
          name: "IpFreqLimit",
          type: "object",
          children: [
            {
              name: "Switch",
              type: "string",
              required: true,
            },
            {
              name: "Qps",
              type: "number",
            }
          ],
        }
      ],
    }
  ]}
/>

---

### `queryStorage`
CloudBase 云存储查询工具。支持列出目录文件、获取文件详情和临时下载链接。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `查询操作类型：list=列出目录下的所有文件，info=获取指定文件的详细信息，url=获取文件的临时下载链接 可填写的值: "list", "info", "url"`,
    },
    {
      name: "cloudPath",
      type: "string",
      required: true,
      description: `云端文件路径，例如 files/data.txt 或 files/（目录）`,
    },
    {
      name: "maxAge",
      type: "number",
      description: `临时链接有效期，单位为秒，取值范围：1-86400，默认值：3600（1小时）`,
    }
  ]}
/>

---

### `manageStorage`
CloudBase 云存储管理工具。支持上传、下载和删除云存储对象（COS）。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `管理操作类型：upload=上传文件或目录，download=下载文件或目录，delete=删除文件或目录 可填写的值: "upload", "download", "delete"`,
    },
    {
      name: "localPath",
      type: "string",
      required: true,
      description: `本地文件路径，建议传入绝对路径，例如 /tmp/files/data.txt`,
    },
    {
      name: "cloudPath",
      type: "string",
      required: true,
      description: `云端文件路径，例如 files/data.txt`,
    },
    {
      name: "force",
      type: "boolean",
      description: `强制操作开关，删除操作时建议设置为true以确认删除，默认false`,
    },
    {
      name: "isDirectory",
      type: "boolean",
      description: `是否为目录操作，true=目录操作，false=文件操作，默认false`,
    }
  ]}
/>

---

### `downloadTemplate`
CloudBase 项目模板下载工具。支持下载 React、Vue、小程序、UniApp 等项目模板，以及 AI 编辑器配置规则。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "template",
      type: "string",
      required: true,
      description: `要下载的模板类型 可填写的值: "react", "vue", "miniprogram", "uniapp", "rules"`,
    },
    {
      name: "ide",
      type: "string",
      required: true,
      description: `指定要下载的IDE类型。 可填写的值: "all", "cursor", "windsurf", "codebuddy", "claude-code", "cline", "gemini-cli", "opencode", "qwen-code", "baidu-comate", "openai-codex-cli", "augment-code", "github-copilot", "roocode", "tongyi-lingma", "trae", "qoder", "antigravity", "vscode", "kiro", "aider", "iflow-cli"`,
    },
    {
      name: "overwrite",
      type: "boolean",
      description: `是否覆盖已存在的文件，默认为false（不覆盖）`,
    }
  ]}
/>

---

### `searchWeb`
联网搜索工具。支持搜索新闻、文章、股价、天气等信息，也可直接输入网址获取网页内容。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "query",
      type: "string",
      required: true,
      description: `搜索关键词、问题或网址，支持自然语言`,
    }
  ]}
/>

---

### `searchKnowledgeBase`
CloudBase 知识库检索工具。支持向量查询、固定技能文档、OpenAPI 文档和官方文档检索。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "mode",
      type: "string",
      required: true,
      description: ` 可填写的值: "vector", "skill", "openapi", "docs"`,
    },
    {
      name: "skillName",
      type: "string",
      description: `mode=skill 时指定。技能名称。 可填写的值: "ai-model-nodejs", "ai-model-web", "ai-model-wechat", "auth-nodejs", "auth-tool", "auth-web", "auth-wechat", "cloud-functions", "cloud-storage-web", "cloudbase-agent", "cloudbase-platform", "cloudrun-development", "data-model-creation", "http-api", "miniprogram-development", "no-sql-web-sdk", "no-sql-wx-mp-sdk", "ops-inspector", "relational-database-tool", "relational-database-web", "spec-workflow", "ui-design", "web-development"`,
    },
    {
      name: "apiName",
      type: "string",
      description: `mode=openapi 时指定。API 名称。 可填写的值: "mysqldb", "functions", "auth", "cloudrun", "storage"`,
    },
    {
      name: "action",
      type: "string",
      description: `mode=docs 时指定。CloudBase 文档操作类型：listModules=列出所有文档模块，listModuleDocs=获取指定模块的目录结构，findByName=按名称/路径/URL 智能查找，readDoc=读取指定文档 Markdown，searchDocs=全文搜索官方文档。 可填写的值: "listModules", "listModuleDocs", "findByName", "readDoc", "searchDocs"`,
    },
    {
      name: "moduleName",
      type: "string",
      description: `mode=docs 且 action=listModuleDocs 时指定。模块名称。`,
    },
    {
      name: "input",
      type: "string",
      description: `mode=docs 且 action=findByName 时指定。支持模块名、文档标题、层级路径或 URL。`,
    },
    {
      name: "docPath",
      type: "string",
      description: `mode=docs 且 action=readDoc 时指定。文档相对路径或完整 URL。`,
    },
    {
      name: "query",
      type: "string",
      description: `mode=docs 且 action=searchDocs 时指定。全文检索关键词。`,
    },
    {
      name: "threshold",
      type: "number",
      description: `mode=vector 时指定。相似性检索阈值`,
    },
    {
      name: "id",
      type: "string",
      description: `mode=vector 时指定。知识库范围，默认 cloudbase。cloudbase=云开发全量知识，scf=云开发的云函数知识, miniprogram=小程序知识（不包含云开发与云函数知识） 可填写的值: "cloudbase", "scf", "miniprogram"`,
    },
    {
      name: "content",
      type: "string",
      description: `mode=vector 时指定。检索内容`,
    },
    {
      name: "options",
      type: "object",
      description: `mode=vector 时指定。其他选项`,
      children: [
        {
          name: "chunkExpand",
          type: "array of number",
          description: `指定返回的文档内容的展开长度,例如 [3,3]代表前后展开长度`,
        }
      ],
    },
    {
      name: "limit",
      type: "number",
      description: `mode=vector 时指定。指定返回最相似的 Top K 的 K 的值`,
    }
  ]}
/>

---

### `queryCloudRun`
CloudBase 云托管查询工具。支持查询服务列表、详情、模板和部署日志。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `查询操作类型：list=获取云托管服务列表（支持分页和筛选），detail=查询指定服务的详细信息（包含服务配置和最新部署状态），templates=获取可用的项目模板列表（用于初始化新项目），getDeployLog=获取指定服务最近一次或指定构建的部署日志 可填写的值: "list", "detail", "templates", "getDeployLog"`,
    },
    {
      name: "pageSize",
      type: "number",
      description: `分页大小，控制每页返回的服务数量。取值范围：1-100，默认值：10。建议根据网络性能和显示需求调整`,
    },
    {
      name: "pageNum",
      type: "number",
      description: `页码，用于分页查询。从1开始，默认值：1。配合pageSize使用可实现分页浏览`,
    },
    {
      name: "serverName",
      type: "string",
      description: `服务名称筛选条件，支持模糊匹配。例如：输入"test"可匹配"test-service"、"my-test-app"等服务名称。留空则查询所有服务`,
    },
    {
      name: "serverType",
      type: "string",
      description: `服务类型筛选条件：function=函数型云托管（仅支持Node.js，有特殊的开发要求和限制，适合简单的API服务），container=容器型服务（推荐使用，支持任意语言和框架如Java/Go/Python/PHP/.NET等，适合大多数应用场景） 可填写的值: "function", "container"`,
    },
    {
      name: "detailServerName",
      type: "string",
      description: `要查询详细信息或部署日志的服务名称。当action为detail或getDeployLog时建议提供，必须是已存在的服务名称。可通过list操作获取可用的服务名称列表`,
    },
    {
      name: "buildId",
      type: "number",
      description: `构建ID，仅在action=getDeployLog时使用。不传时默认返回最近一次部署的构建日志`,
    }
  ]}
/>

---

### `manageCloudRun`
CloudBase 云托管管理工具。支持初始化项目、下载代码、本地运行、部署和删除服务。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `云托管服务管理操作类型：init=从模板初始化新的云托管项目代码（在targetPath目录下创建以serverName命名的子目录，支持多种语言和框架模板），download=从云端下载现有服务的代码到本地进行开发，run=在本地运行函数型云托管服务（用于开发和调试，仅支持函数型服务），deploy=将本地代码部署到云端云托管服务（支持函数型和容器型），delete=删除指定的云托管服务（不可恢复，需要确认），createAgent=创建函数型Agent（基于函数型云托管开发AI智能体） 可填写的值: "init", "download", "run", "deploy", "delete", "createAgent"`,
    },
    {
      name: "serverName",
      type: "string",
      required: true,
      description: `云托管服务名称，用于标识和管理服务。命名规则：支持大小写字母、数字、连字符和下划线，必须以字母开头，长度3-45个字符。在init操作中会作为在targetPath下创建的子目录名，在其他操作中作为目标服务名`,
    },
    {
      name: "targetPath",
      type: "string",
      description: `本地代码路径，必须是绝对路径。在deploy操作中指定要部署的代码目录，在download操作中指定下载目标目录，在init操作中指定云托管服务的上级目录（会在该目录下创建以serverName命名的子目录）。建议约定：项目根目录下的cloudrun/目录，例如：/Users/username/projects/my-project/cloudrun`,
    },
    {
      name: "serverConfig",
      type: "object",
      description: `服务配置项，用于部署时设置服务的运行参数。包括资源规格、访问权限、环境变量等配置。不提供时使用默认配置`,
      children: [
        {
          name: "OpenAccessTypes",
          type: "array of string",
          description: `公网访问类型配置，控制服务的访问权限：OA=办公网访问，PUBLIC=公网访问（默认，可通过HTTPS域名访问），MINIAPP=小程序访问，VPC=VPC访问（仅同VPC内可访问）。可配置多个类型`,
        },
        {
          name: "Cpu",
          type: "number",
          description: `CPU规格配置，单位为核。可选值：0.25、0.5、1、2、4、8等。注意：内存规格必须是CPU规格的2倍（如CPU=0.25时内存=0.5，CPU=1时内存=2）。影响服务性能和计费`,
        },
        {
          name: "Mem",
          type: "number",
          description: `内存规格配置，单位为GB。可选值：0.5、1、2、4、8、16等。注意：必须是CPU规格的2倍。影响服务性能和计费`,
        },
        {
          name: "MinNum",
          type: "number",
          description: `最小实例数配置，控制服务的最小运行实例数量。设置为0时支持缩容到0（无请求时不产生费用），设置为大于0时始终保持指定数量的实例运行（确保快速响应但会增加成本）。建议设置为1以降低冷启动延迟，提升用户体验`,
        },
        {
          name: "MaxNum",
          type: "number",
          description: `最大实例数配置，控制服务的最大运行实例数量。当请求量增加时，服务最多可以扩展到指定数量的实例，超过此数量后将拒绝新的请求。建议根据业务峰值设置`,
        },
        {
          name: "PolicyDetails",
          type: "array of object",
          description: `扩缩容配置数组，用于配置服务的自动扩缩容策略。可配置多个扩缩容策略`,
          children: [
            {
              name: "PolicyType",
              type: "string",
              required: true,
              description: `扩缩容类型：cpu=基于CPU使用率扩缩容，mem=基于内存使用率扩缩容，cpu/mem=基于CPU和内存使用率扩缩容 可填写的值: "cpu", "mem", "cpu/mem"`,
            },
            {
              name: "PolicyThreshold",
              type: "number",
              required: true,
              description: `扩缩容阈值，单位为百分比。如60表示当资源使用率达到60%时触发扩缩容`,
            }
          ],
        },
        {
          name: "CustomLogs",
          type: "string",
          description: `自定义日志配置，用于配置服务的日志收集和存储策略`,
        },
        {
          name: "Port",
          type: "number",
          description: `服务监听端口配置。函数型服务固定为3000，容器型服务可自定义。服务代码必须监听此端口才能正常接收请求`,
        },
        {
          name: "EnvParams",
          type: "string",
          description: `环境变量配置，JSON字符串格式。用于传递配置信息给服务代码，如'{"DATABASE_URL":"mysql://...","NODE_ENV":"production"}'。敏感信息建议使用环境变量而非硬编码`,
        },
        {
          name: "Dockerfile",
          type: "string",
          description: `Dockerfile文件名配置，仅容器型服务需要。指定用于构建容器镜像的Dockerfile文件路径，默认为项目根目录下的Dockerfile`,
        },
        {
          name: "BuildDir",
          type: "string",
          description: `构建目录配置，指定代码构建的目录路径。当代码结构与标准不同时使用，默认为项目根目录`,
        },
        {
          name: "InternalAccess",
          type: "string",
          description: `内网访问开关配置，控制是否启用内网访问。true=启用内网访问（可通过云开发SDK直接调用），false=关闭内网访问（仅公网访问）`,
        },
        {
          name: "InternalDomain",
          type: "string",
          description: `内网域名配置，用于配置服务的内网访问域名。仅在启用内网访问时有效`,
        },
        {
          name: "EntryPoint",
          type: "array of string",
          description: `Dockerfile EntryPoint参数配置，仅容器型服务需要。指定容器启动时的入口程序数组，如["node","app.js"]`,
        },
        {
          name: "Cmd",
          type: "array of string",
          description: `Dockerfile Cmd参数配置，仅容器型服务需要。指定容器启动时的默认命令数组，如["npm","start"]`,
        }
      ],
    },
    {
      name: "template",
      type: "string",
      description: `项目模板标识符，用于指定初始化项目时使用的模板。可通过queryCloudRun的templates操作获取可用模板列表。常用模板：helloworld=Hello World示例，nodejs=Node.js项目模板，python=Python项目模板等`,
    },
    {
      name: "runOptions",
      type: "object",
      description: `本地运行参数配置，仅函数型云托管服务支持。用于配置本地开发环境的运行参数，不影响云端部署`,
      children: [
        {
          name: "port",
          type: "number",
          description: `本地运行端口配置，仅函数型服务有效。指定服务在本地运行时监听的端口号，默认3000。确保端口未被其他程序占用`,
        },
        {
          name: "envParams",
          type: "object",
          description: `本地运行时的附加环境变量配置，用于本地开发和调试。格式为键值对，如{"DEBUG":"true","LOG_LEVEL":"debug"}。这些变量仅在本地运行时生效`,
        },
        {
          name: "runMode",
          type: "string",
          description: `运行模式：normal=普通函数模式，agent=Agent模式（用于AI智能体开发） 可填写的值: "normal", "agent"`,
        },
        {
          name: "agentId",
          type: "string",
          description: `Agent ID，在agent模式下使用，用于标识特定的Agent实例`,
        }
      ],
    },
    {
      name: "agentConfig",
      type: "object",
      description: `Agent配置项，仅在createAgent操作时使用`,
      children: [
        {
          name: "agentName",
          type: "string",
          required: true,
          description: `Agent名称，用于生成BotId`,
        },
        {
          name: "botTag",
          type: "string",
          description: `Bot标签，用于生成BotId，不提供时自动生成`,
        },
        {
          name: "description",
          type: "string",
          description: `Agent描述信息`,
        },
        {
          name: "template",
          type: "string",
          description: `Agent模板类型，默认为blank（空白模板）`,
        }
      ],
    },
    {
      name: "force",
      type: "boolean",
      description: `强制操作开关，用于跳过确认提示。默认false（需要确认），设置为true时跳过所有确认步骤。删除操作时强烈建议设置为true以避免误操作`,
    },
    {
      name: "serverType",
      type: "string",
      description: `服务类型配置：function=函数型云托管（仅支持Node.js，有特殊的开发要求和限制，适合简单的API服务），container=容器型服务（推荐使用，支持任意语言和框架如Java/Go/Python/PHP/.NET等，适合大多数应用场景）。不提供时自动检测：1)现有服务类型 2)有Dockerfile→container 3)有@cloudbase/aiagent-framework依赖→function 4)其他情况→container 可填写的值: "function", "container"`,
    }
  ]}
/>

---

### `queryGateway`
CloudBase HTTP 访问服务（网关）查询工具。支持查询访问入口、域名和路由配置。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `只读操作类型，例如 getAccess、listDomains 可填写的值: "getAccess", "listDomains", "listRoutes", "getRoute", "listCustomDomains"`,
    },
    {
      name: "targetType",
      type: "string",
      description: `目标资源类型。当前支持 function，后续可扩展 可填写的值: "function"`,
    },
    {
      name: "targetName",
      type: "string",
      description: `目标资源名称。getAccess 时必填`,
    },
    {
      name: "routeId",
      type: "string",
      description: `路由 ID。getRoute 时可选`,
    }
  ]}
/>

---

### `manageGateway`
CloudBase HTTP 访问服务（网关）管理工具。支持创建访问入口、配置路由和绑定自定义域名。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: `写操作类型，例如 createAccess 可填写的值: "createAccess", "createRoute", "updateRoute", "deleteRoute", "bindCustomDomain", "deleteCustomDomain", "deleteAccess", "updatePathAuth"`,
    },
    {
      name: "targetType",
      type: "string",
      description: `目标资源类型。当前支持 function，后续可扩展 可填写的值: "function"`,
    },
    {
      name: "targetName",
      type: "string",
      description: `目标资源名称`,
    },
    {
      name: "path",
      type: "string",
      description: `访问路径，默认 /{targetName}`,
    },
    {
      name: "type",
      type: "string",
      description: `目标函数的本身类型（非接入形式）。如果被访问的函数是 Event 型（默认），此处必须传 Event；只有当被访问函数在创建时就是 HTTP 函数时才传 HTTP。 可填写的值: "Event", "HTTP"`,
    },
    {
      name: "auth",
      type: "boolean",
      description: `是否开启鉴权`,
    },
    {
      name: "route",
      type: "object",
      description: `HTTP 路由配置对象`,
      children: [
        {
          name: "routeId",
          type: "string",
        },
        {
          name: "path",
          type: "string",
        },
        {
          name: "serviceType",
          type: "string",
        },
        {
          name: "serviceName",
          type: "string",
        },
        {
          name: "auth",
          type: "boolean",
        }
      ],
    },
    {
      name: "domain",
      type: "string",
      description: `自定义域名`,
    },
    {
      name: "certificateId",
      type: "string",
      description: `证书 ID`,
    },
    {
      name: "accessName",
      type: "string",
      description: `访问入口名称，保留字段`,
    }
  ]}
/>

---

### `queryAppAuth`
CloudBase 应用认证查询工具。支持查询登录配置、Provider、Publishable Key、API Key 和客户端配置。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "getLoginConfig", "listProviders", "getProvider", "getClientConfig", "getPublishableKey", "getStaticDomain", "listApiKeys"`,
    },
    {
      name: "providerId",
      type: "string",
      description: `provider 标识，如 email、google`,
    },
    {
      name: "clientId",
      type: "string",
      description: `OAuth client_id / DescribeClient 的 Id；省略时默认使用当前环境 ID（默认客户端）`,
    },
    {
      name: "keyType",
      type: "string",
      description: `API key 类型过滤，可选 publish_key 或 api_key 可填写的值: "publish_key", "api_key"`,
    },
    {
      name: "pageNumber",
      type: "integer",
      description: `API key 列表页码，从 1 开始`,
    },
    {
      name: "pageSize",
      type: "integer",
      description: `API key 列表每页条数`,
    }
  ]}
/>

---

### `manageAppAuth`
CloudBase 应用认证管理工具。支持配置登录策略、管理 Provider 和 API Key。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "patchLoginStrategy", "addProvider", "updateProvider", "deleteProvider", "updateClientConfig", "ensurePublishableKey", "createApiKey", "deleteApiKey", "createCustomLoginKeys"`,
    },
    {
      name: "patch",
      type: "object",
      description: `patchLoginStrategy 使用的简化登录策略 patch，如 { usernamePassword: true }`,
    },
    {
      name: "providerId",
      type: "string",
      description: `provider 标识，如 email、google；addProvider 时也可作为自定义 provider Id`,
    },
    {
      name: "providerType",
      type: "string",
      description: `addProvider 时的 provider 协议类型，如 OAUTH、OIDC、EMAIL`,
    },
    {
      name: "displayName",
      type: "union",
      description: `addProvider 时的展示名称，可传字符串或多语言对象`,
    },
    {
      name: "clientId",
      type: "string",
      description: `updateClientConfig 时的客户端 Id；省略时默认使用当前环境 ID`,
    },
    {
      name: "config",
      type: "object",
      description: `provider / client 的配置对象`,
    },
    {
      name: "keyType",
      type: "string",
      description: `createApiKey 时的 API key 类型，默认 publish_key 可填写的值: "publish_key", "api_key"`,
    },
    {
      name: "keyName",
      type: "string",
      description: `createApiKey 时的 API key 名称`,
    },
    {
      name: "expireIn",
      type: "integer",
      description: `createApiKey 时的有效期，单位秒；0 表示不过期`,
    },
    {
      name: "keyId",
      type: "string",
      description: `deleteApiKey 时的 API key 唯一标识`,
    }
  ]}
/>

---

### `queryPermissions`
CloudBase 权限与用户查询工具。支持查询资源权限、角色和应用用户。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "getResourcePermission", "listResourcePermissions", "listRoles", "getRole", "listUsers", "getUser"`,
    },
    {
      name: "resourceType",
      type: "string",
      description: ` 可填写的值: "noSqlDatabase", "sqlDatabase", "function", "storage"`,
    },
    {
      name: "resourceId",
      type: "string",
    },
    {
      name: "resourceIds",
      type: "array of string",
    },
    {
      name: "roleId",
      type: "string",
    },
    {
      name: "roleIdentity",
      type: "string",
    },
    {
      name: "roleName",
      type: "string",
    },
    {
      name: "uid",
      type: "string",
    },
    {
      name: "username",
      type: "string",
    },
    {
      name: "pageNo",
      type: "number",
    },
    {
      name: "pageSize",
      type: "number",
    }
  ]}
/>

---

### `managePermissions`
CloudBase 权限与用户管理工具。支持配置安全规则、管理角色成员和应用用户。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "updateResourcePermission", "createRole", "updateRole", "deleteRoles", "addRoleMembers", "removeRoleMembers", "addRolePolicies", "removeRolePolicies", "createUser", "updateUser", "deleteUsers"`,
    },
    {
      name: "resourceType",
      type: "string",
      description: `目标资源类型。\`securityRule\` 的具体语义依赖这个值；\`noSqlDatabase\` 使用集合安全规则，\`function\` 与 \`storage\` 也有各自独立的安全规则语义，不要套用 NoSQL 规则语法。 可填写的值: "noSqlDatabase", "sqlDatabase", "function", "storage"`,
    },
    {
      name: "resourceId",
      type: "string",
    },
    {
      name: "permission",
      type: "string",
      description: ` 可填写的值: "READONLY", "PRIVATE", "ADMINWRITE", "ADMINONLY", "CUSTOM"`,
    },
    {
      name: "securityRule",
      type: "string",
      description: `资源类型特定的规则内容，详细语义依赖 \`resourceType\`。当 \`resourceType="noSqlDatabase"\` 且 \`permission="CUSTOM"\` 时，应传文档数据库安全规则 JSON（文档型数据库规则：\`https://docs.cloudbase.net/database/security-rules\`）；键通常为 \`read\` / \`create\` / \`update\` / \`delete\`，值为表达式。重要：\`create\` 规则验证写入数据，此时文档尚不存在，不能使用 \`doc.*\`；\`read\` / \`update\` / \`delete\` 规则可使用 \`doc.*\` 引用已有文档字段。不要把 \`doc._openid\`、\`auth.openid\`、查询条件子集校验或 \`create\` / \`update\` / \`delete\` 模板误用于 \`function\`、\`storage\` 或 \`sqlDatabase\`。如需配置 \`function\` 或 \`storage\`，请改查官方安全规则文档：云函数 \`https://docs.cloudbase.net/cloud-function/security-rules\`，云存储 \`https://docs.cloudbase.net/storage/security-rules\`。示例：{"read":"auth.uid != null","create":"auth.uid != null && auth.loginType != "ANONYMOUS"","update":"auth.uid != null && doc._openid == auth.openid","delete":"auth.uid != null && doc._openid == auth.openid"}`,
    },
    {
      name: "roleId",
      type: "string",
    },
    {
      name: "roleIds",
      type: "array of string",
    },
    {
      name: "roleName",
      type: "string",
    },
    {
      name: "roleIdentity",
      type: "string",
    },
    {
      name: "description",
      type: "string",
    },
    {
      name: "memberUids",
      type: "array of string",
    },
    {
      name: "policies",
      type: "array of object",
    },
    {
      name: "uid",
      type: "string",
    },
    {
      name: "uids",
      type: "array of string",
    },
    {
      name: "username",
      type: "string",
    },
    {
      name: "password",
      type: "string",
    },
    {
      name: "userStatus",
      type: "string",
      description: ` 可填写的值: "ACTIVE", "BLOCKED"`,
    }
  ]}
/>

---

### `queryLogs`
CloudBase 日志查询工具。支持检查日志服务状态和搜索 CLS 日志。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "checkLogService", "searchLogs"`,
    },
    {
      name: "queryString",
      type: "string",
    },
    {
      name: "service",
      type: "string",
      description: ` 可填写的值: "tcb", "tcbr"`,
    },
    {
      name: "startTime",
      type: "string",
    },
    {
      name: "endTime",
      type: "string",
    },
    {
      name: "limit",
      type: "number",
    },
    {
      name: "context",
      type: "string",
    },
    {
      name: "sort",
      type: "string",
      description: ` 可填写的值: "asc", "desc"`,
    }
  ]}
/>

---

### `queryAgents`
CloudBase AI Agent 查询工具。支持查询 Agent 列表、详情和运行日志。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "listAgents", "getAgent", "getAgentLogs"`,
    },
    {
      name: "agentId",
      type: "string",
    },
    {
      name: "pageNumber",
      type: "number",
    },
    {
      name: "pageSize",
      type: "number",
    },
    {
      name: "params",
      type: "object",
    }
  ]}
/>

---

### `manageAgents`
CloudBase AI Agent 管理工具。支持创建、更新和删除远端 Agent。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "action",
      type: "string",
      required: true,
      description: ` 可填写的值: "createAgent", "updateAgent", "deleteAgent"`,
    },
    {
      name: "agentId",
      type: "string",
    },
    {
      name: "params",
      type: "object",
    }
  ]}
/>

---

### `downloadRemoteFile`
远程文件下载工具。支持将远程文件下载到项目指定路径。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "url",
      type: "string",
      required: true,
      description: `远程文件的 URL 地址`,
    },
    {
      name: "relativePath",
      type: "string",
      required: true,
      description: `相对于项目根目录的路径，例如：'assets/images/logo.png' 或 'docs/api.md'。不允许使用 ../ 等路径遍历操作。`,
    }
  ]}
/>

---

### `activateInviteCode`
CloudBase AI 编程激励计划激活工具。通过邀请码激活用户激励。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "InviteCode",
      type: "string",
      required: true,
      description: `待激活的邀请码`,
    }
  ]}
/>

---

### `callCloudApi`
腾讯云 API 通用调用工具。支持调用 CloudBase 及腾讯云各服务的管控面 API。

#### 参数

<ParameterTable
  parameters={[
    {
      name: "service",
      type: "string",
      required: true,
      description: `选择要访问的服务。可选：tcb、scf、sts、cam、lowcode、cdn、vpc。对于 tcb / scf / lowcode 等 CloudBase 管控面 Action，请优先查官方文档，不要直接猜测 Action。 可填写的值: "tcb", "scf", "sts", "cam", "lowcode", "cdn", "vpc"`,
    },
    {
      name: "action",
      type: "string",
      required: true,
      description: `具体 Action 名称，需符合对应服务的官方 API 定义。若不确定正确 Action，请先查官方文档；不要用近义词或历史命名进行猜测。tcb 常用 Action：环境管理 CreateEnv/ModifyEnv/DescribeEnvs/DestroyEnv、用户管理 CreateUser/ModifyUser/DescribeUserList/DeleteUsers、认证配置 EditAuthConfig、云函数 DescribeFunctions/CreateFunction、数据库 CreateMySQLInstance 等。`,
    },
    {
      name: "params",
      type: "object",
      description: `Action 对应的参数对象，键名需与官方 API 定义一致。某些 Action 需要携带 EnvId 等信息；如不确定参数结构，请先查官方文档。tcb 示例：\`{ "service": "tcb", "action": "DestroyEnv", "params": { "EnvId": "env-xxx", "BypassCheck": true } }\`，如果环境已经处于隔离期，可再补 \`IsForce: true\`；更新环境别名则可用 \`{ "service": "tcb", "action": "ModifyEnv", "params": { "EnvId": "env-xxx", "Alias": "demo" } }\`。若你的场景是通过 HTTP 协议直接集成 auth/functions/cloudrun/storage/mysqldb 等 CloudBase 业务 API，请优先使用 OpenAPI / Swagger 或 searchKnowledgeBase(mode="openapi")，而不是优先使用 callCloudApi。`,
    }
  ]}
/>

---
