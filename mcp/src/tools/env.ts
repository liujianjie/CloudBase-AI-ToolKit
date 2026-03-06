import { z } from "zod";
import { AuthSupevisor } from "@cloudbase/toolbox";
import {
  ensureLogin,
  getAuthProgressState,
  logout,
  rejectAuthProgressState,
  resolveAuthProgressState,
  setPendingAuthProgressState,
  type DeviceFlowAuthInfo,
} from "../auth.js";
import {
  envManager,
  getCachedEnvId,
  getCloudBaseManager,
  listAvailableEnvCandidates,
  logCloudBaseResult,
  resetCloudBaseManagerCache,
  type EnvCandidate,
} from "../cloudbase-manager.js";
import { ExtendedMcpServer } from "../server.js";
import {
  buildJsonToolResult,
  buildLoginNextStep,
  toolPayloadErrorToResult,
} from "../utils/tool-result.js";
import { debug } from "../utils/logger.js";
import { _promptAndSetEnvironmentId } from "./interactive.js";
import { getClaudePrompt } from "./rag.js";

/**
 * Simplify environment list data by keeping only essential fields for AI assistant
 * This reduces token consumption when returning environment lists via MCP tools
 * @param envList - Full environment list from API
 * @returns Simplified environment list with only essential fields
 */
export function simplifyEnvList(envList: any[]): any[] {
  if (!Array.isArray(envList)) {
    return envList;
  }

  return envList.map((env: any) => {
    // Only keep essential fields that are useful for AI assistant
    const simplified: any = {};
    
    if (env.EnvId !== undefined) simplified.EnvId = env.EnvId;
    if (env.Alias !== undefined) simplified.Alias = env.Alias;
    if (env.Status !== undefined) simplified.Status = env.Status;
    if (env.EnvType !== undefined) simplified.EnvType = env.EnvType;
    if (env.Region !== undefined) simplified.Region = env.Region;
    if (env.PackageName !== undefined) simplified.PackageName = env.PackageName;
    if (env.IsDefault !== undefined) simplified.IsDefault = env.IsDefault;
    
    return simplified;
  });
}

function formatDeviceAuthHint(deviceAuthInfo?: DeviceFlowAuthInfo): string {
  if (!deviceAuthInfo) {
    return "";
  }

  const lines = [
    "",
    "### Device Flow 授权信息",
    `- user_code: ${deviceAuthInfo.user_code}`,
  ];

  if (deviceAuthInfo.verification_uri) {
    lines.push(`- verification_uri: ${deviceAuthInfo.verification_uri}`);
  }
  lines.push(`- expires_in: ${deviceAuthInfo.expires_in}s`);
  lines.push(
    "",
    "请在另一台可用浏览器设备打开 `verification_uri` 并输入 `user_code` 完成授权。",
  );
  return lines.join("\n");
}

function emitDeviceAuthNotice(server: ExtendedMcpServer, deviceAuthInfo: DeviceFlowAuthInfo): void {
  // Temporarily disabled: avoid sending logging notifications for device auth
}

async function fetchAvailableEnvCandidates(
  cloudBaseOptions: any,
  server: ExtendedMcpServer,
): Promise<EnvCandidate[]> {
  try {
    return await listAvailableEnvCandidates({
      cloudBaseOptions,
    });
  } catch {
    return [];
  }
}

export function registerEnvTools(server: ExtendedMcpServer) {
  // 获取 cloudBaseOptions，如果没有则为 undefined
  const cloudBaseOptions = server.cloudBaseOptions;

  const getManager = () => getCloudBaseManager({ cloudBaseOptions, mcpServer: server });

  const hasEnvId = typeof cloudBaseOptions?.envId === 'string' && cloudBaseOptions?.envId.length > 0;

  // login - 登录云开发环境
  server.registerTool?.(
    "login",
    {
      title: "登录云开发",
      description:
        "登录云开发环境，在生成包含云开发 CloudBase 相关功能前**必须**先调用此工具进行登录。登录云开发环境并选择要使用的环境。",
      inputSchema: {
        action: z
          .enum(["ensure", "start_auth", "select_env", "status"])
          .optional()
          .describe("登录动作：ensure=确保已登录并绑定环境，start_auth=仅发起认证，select_env=仅设置环境，status=查询当前状态"),
        forceUpdate: z.boolean().optional().describe("是否强制重新选择环境"),
        authMode: z
          .enum(["device", "web"])
          .optional()
          .describe("认证模式：device=设备码授权，web=浏览器回调授权"),
        envId: z
          .string()
          .optional()
          .describe("环境ID。action=select_env 时可直接指定环境，避免交互式选择"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        category: "env",
      },
    },
    async ({
      action = "ensure",
      forceUpdate = false,
      authMode,
      envId,
    }: {
      action?: "ensure" | "start_auth" | "select_env" | "status";
      forceUpdate?: boolean;
      authMode?: "device" | "web";
      envId?: string;
    }) => {
      let isSwitching = false;
      let deviceAuthInfo: DeviceFlowAuthInfo | undefined;
      const onDeviceCode = (info: DeviceFlowAuthInfo) => {
        deviceAuthInfo = info;
        setPendingAuthProgressState(info, "device");
        // emitDeviceAuthNotice(server, info);
      };
      const authChallenge = () =>
        deviceAuthInfo
          ? {
            user_code: deviceAuthInfo.user_code,
            verification_uri: deviceAuthInfo.verification_uri,
            expires_in: deviceAuthInfo.expires_in,
          }
          : undefined;

      try {
        if (action === "status") {
          const auth = AuthSupevisor.getInstance({});
          const loginState = await auth.getLoginState();
          const authFlowState = await getAuthProgressState();
          const envId =
            getCachedEnvId() ||
            process.env.CLOUDBASE_ENV_ID ||
            (typeof loginState?.envId === "string" ? loginState.envId : undefined);

          const authStatus = loginState
            ? "READY"
            : authFlowState.status === "PENDING"
              ? "PENDING"
              : "REQUIRED";
          const envCandidates = await fetchAvailableEnvCandidates(cloudBaseOptions, server);
          const envStatus = envId
            ? "READY"
            : envCandidates.length > 1
              ? "MULTIPLE"
              : envCandidates.length === 1
                ? "READY"
                : "NONE";
          const message =
            authStatus === "READY"
              ? `当前已登录${envId ? `，环境: ${envId}` : "，但未绑定环境"}`
              : authStatus === "PENDING"
                ? "设备码授权进行中，请完成浏览器授权后再次调用 status 或 ensure"
              : "当前未登录，请先执行 start_auth";

          return buildJsonToolResult({
            ok: true,
            code: "STATUS",
            auth_status: authStatus,
            env_status: envStatus,
            current_env_id: envId || null,
            env_candidates: envCandidates,
            auth_challenge:
              authFlowState.status === "PENDING" && authFlowState.authChallenge
                ? {
                    user_code: authFlowState.authChallenge.user_code,
                    verification_uri: authFlowState.authChallenge.verification_uri,
                    expires_in: authFlowState.authChallenge.expires_in,
                  }
                : undefined,
            message,
            next_step:
              authStatus === "REQUIRED"
                ? buildLoginNextStep("start_auth", {
                    suggestedArgs: { action: "start_auth", authMode: "device" },
                  })
                : authStatus === "PENDING"
                  ? buildLoginNextStep("status", {
                      suggestedArgs: { action: "status" },
                    })
                : envStatus === "MULTIPLE" || envStatus === "NONE"
                  ? buildLoginNextStep("select_env", {
                      requiredParams: ["envId"],
                      suggestedArgs: { action: "select_env" },
                    })
                  : buildLoginNextStep("ensure", {
                      suggestedArgs: { action: "ensure" },
                    }),
          });
        }

        if (action === "start_auth") {
          const region = server.cloudBaseOptions?.region || process.env.TCB_REGION;
          const auth = AuthSupevisor.getInstance({});
          const authFlowState = await getAuthProgressState();

          if (authFlowState.status === "PENDING" && authFlowState.authChallenge) {
            return buildJsonToolResult({
              ok: true,
              code: "AUTH_PENDING",
              message:
                "设备码授权进行中，请在浏览器中打开 verification_uri 并输入 user_code 完成授权。",
              auth_challenge: {
                user_code: authFlowState.authChallenge.user_code,
                verification_uri: authFlowState.authChallenge.verification_uri,
                expires_in: authFlowState.authChallenge.expires_in,
              },
              next_step: buildLoginNextStep("status", {
                suggestedArgs: { action: "status" },
              }),
            });
          }

          // 1. 如果已经有登录态，直接返回 AUTH_READY
          try {
            const existingLoginState = await auth.getLoginState();
            if (existingLoginState) {
              const envId =
                typeof existingLoginState.envId === "string" ? existingLoginState.envId : null;
              const envCandidates = envId
                ? []
                : await fetchAvailableEnvCandidates(cloudBaseOptions, server);
              return buildJsonToolResult({
                ok: true,
                code: "AUTH_READY",
                message: envId
                  ? `认证成功，当前登录态 envId: ${envId}`
                  : "认证成功",
                auth_challenge: authChallenge(),
                env_candidates: envCandidates,
                next_step: envId
                  ? buildLoginNextStep("ensure", {
                      suggestedArgs: { action: "ensure" },
                    })
                  : buildLoginNextStep("select_env", {
                      requiredParams: ["envId"],
                      suggestedArgs: { action: "select_env" },
                    }),
              });
            }
          } catch {
            // 忽略 getLoginState 错误，继续尝试发起登录
          }

          // 2. 设备码模式：监听到 device code 即返回 AUTH_PENDING，后续由 toolbox 异步轮询并更新本地 credential
          const effectiveMode: "device" | "web" =
            authMode && (authMode === "device" || authMode === "web")
              ? authMode
              : process.env.TCB_AUTH_MODE === "web"
                ? "web"
                : "device";

          if (effectiveMode === "device") {
            let resolveCode: (() => void) | undefined;
            let rejectCode: ((reason?: unknown) => void) | undefined;
            const codeReady = new Promise<void>((resolve, reject) => {
              resolveCode = resolve;
              rejectCode = reject;
            });

            const deviceOnCode = (info: DeviceFlowAuthInfo) => {
              onDeviceCode(info);
              if (resolveCode) {
                resolveCode();
              }
            };

            try {
              // 启动 Device Flow，全流程由 toolbox 负责轮询和写入 credential，这里不等待完成
              (auth as any)
                .loginByWebAuth({
                  mode: "device",
                  onDeviceCode: deviceOnCode,
                })
                .then(() => {
                  resolveAuthProgressState();
                })
                .catch((err: unknown) => {
                  rejectAuthProgressState(err);
                  // 如果在拿到 device code 之前就失败，则唤醒当前调用并返回错误
                  if (!deviceAuthInfo && rejectCode) {
                    rejectCode(err);
                  }
                });
            } catch (err) {
              if (rejectCode) {
                rejectCode(err);
              }
            }

            try {
              await codeReady;
            } catch (err) {
              const message =
                err instanceof Error ? err.message : String(err ?? "unknown error");
              return buildJsonToolResult({
                ok: false,
                code: "AUTH_REQUIRED",
                message: `设备码登录初始化失败: ${message}`,
                next_step: buildLoginNextStep("start_auth", {
                  suggestedArgs: { action: "start_auth", authMode: "device" },
                }),
              });
            }

            if (!deviceAuthInfo) {
              return buildJsonToolResult({
                ok: false,
                code: "AUTH_REQUIRED",
                message: "未获取到设备码信息，请重试设备码登录",
                next_step: buildLoginNextStep("start_auth", {
                  suggestedArgs: { action: "start_auth", authMode: "device" },
                }),
              });
            }

            const envCandidates = await fetchAvailableEnvCandidates(cloudBaseOptions, server);
            return buildJsonToolResult({
              ok: true,
              code: "AUTH_PENDING",
              message:
                "已发起设备码登录，请在浏览器中打开 verification_uri 并输入 user_code 完成授权。授权完成后请再次调用 login(action=\"status\") 或 login(action=\"ensure\")。",
              auth_challenge: authChallenge(),
              env_candidates: envCandidates,
              next_step: buildLoginNextStep("status", {
                suggestedArgs: { action: "status" },
              }),
            });
          }

          // 3. 非 Device Flow（显式 web 模式）仍然使用 getLoginState 阻塞等待
          const loginState = await ensureLogin({
            region,
            authMode: effectiveMode,
          });

          if (!loginState) {
            return buildJsonToolResult({
              ok: false,
              code: "AUTH_REQUIRED",
              message: "未获取到登录态，请先完成认证",
              next_step: buildLoginNextStep("start_auth", {
                suggestedArgs: { action: "start_auth", authMode: effectiveMode },
              }),
            });
          }

          const envId =
            typeof loginState.envId === "string" ? loginState.envId : null;
          const envCandidates = envId
            ? []
            : await fetchAvailableEnvCandidates(cloudBaseOptions, server);
          return buildJsonToolResult({
            ok: true,
            code: "AUTH_READY",
            message: envId ? `认证成功，当前登录态 envId: ${envId}` : "认证成功",
            auth_challenge: authChallenge(),
            env_candidates: envCandidates,
            next_step: envId
              ? buildLoginNextStep("ensure", {
                  suggestedArgs: { action: "ensure" },
                })
              : buildLoginNextStep("select_env", {
                  requiredParams: ["envId"],
                  suggestedArgs: { action: "select_env" },
                }),
          });
        }

        if (action === "select_env" && envId) {
          const envCandidates = await fetchAvailableEnvCandidates(cloudBaseOptions, server);
          const target = envCandidates.find((item) => item.envId === envId);
          if (!target) {
            return buildJsonToolResult({
              ok: false,
              code: "INVALID_ARGS",
              message: `未找到环境: ${envId}`,
              env_candidates: envCandidates,
              next_step: buildLoginNextStep("select_env", {
                requiredParams: ["envId"],
                suggestedArgs: { action: "select_env" },
              }),
            });
          }
          await envManager.setEnvId(envId);
          return buildJsonToolResult({
            ok: true,
            code: "ENV_READY",
            message: `环境设置成功，当前环境: ${envId}`,
            current_env_id: envId,
            env_candidates: envCandidates,
            next_step: buildLoginNextStep("ensure", {
              suggestedArgs: { action: "ensure" },
            }),
          });
        }

        // 使用 while 循环处理用户切换账号的情况
        while (true) {
          // CRITICAL: Ensure server is passed correctly
          debug("[env] Calling _promptAndSetEnvironmentId with server:", {
            hasServer: !!server,
            serverType: typeof server,
            hasServerServer: !!server?.server,
            hasServerIde: !!server?.ide,
            serverIde: server?.ide
          });

          const {
            selectedEnvId,
            cancelled,
            error,
            noEnvs,
            switch: switchAccount,
          } = await _promptAndSetEnvironmentId(forceUpdate, {
            server, // Pass ExtendedMcpServer instance
            loginFromCloudBaseLoginPage: isSwitching,
            // When switching account, ignore environment variables to force Web login
            ignoreEnvVars: isSwitching,
            authMode,
            onDeviceCode,
          });

          isSwitching = Boolean(switchAccount);

          debug("login", {
            selectedEnvId,
            cancelled,
            error,
            noEnvs,
            switchAccount,
          });

          if (error) {
            const normalizedError = String(error || "");
            const code = noEnvs
              ? "NO_ENV"
              : normalizedError.includes("请先登录")
                ? "AUTH_REQUIRED"
                : normalizedError.includes("过期")
                  ? "AUTH_EXPIRED"
                  : normalizedError.includes("拒绝")
                    ? "AUTH_DENIED"
                    : "INTERNAL_ERROR";
            return buildJsonToolResult({
              ok: false,
              code,
              message: normalizedError,
              auth_challenge: authChallenge(),
              env_candidates:
                code === "NO_ENV"
                  ? await fetchAvailableEnvCandidates(cloudBaseOptions, server)
                  : undefined,
              next_step:
                code === "AUTH_REQUIRED" || code === "AUTH_EXPIRED" || code === "AUTH_DENIED"
                  ? buildLoginNextStep("start_auth", {
                      suggestedArgs: { action: "start_auth", authMode: authMode || "device" },
                    })
                  : code === "NO_ENV"
                    ? buildLoginNextStep("status", {
                        suggestedArgs: { action: "status" },
                      })
                    : buildLoginNextStep("ensure", {
                        suggestedArgs: { action: "ensure" },
                      }),
            });
          }

          if (cancelled) {
            return buildJsonToolResult({
              ok: false,
              code: "USER_CANCELLED",
              message: "用户取消了登录流程",
              auth_challenge: authChallenge(),
              next_step: buildLoginNextStep("ensure", {
                suggestedArgs: { action: "ensure" },
              }),
            });
          }

          // 用户选择切换账号，先 logout 再重新登录
          if (switchAccount) {
            debug("User requested switch account, logging out...");
            try {
              await logout();
              resetCloudBaseManagerCache();
              debug("Logged out successfully, restarting login flow...");
              // Set isSwitching to true so next iteration will ignore env vars
              // and force Web authentication to allow account switching
              isSwitching = true;
              // 继续循环，重新显示登录界面
              continue;
            } catch (logoutError) {
              debug("Logout failed during switch", { error: logoutError });
              continue;
            }
          }

          if (selectedEnvId) {
            const deviceHint = formatDeviceAuthHint(deviceAuthInfo);

            if (action === "select_env") {
              return buildJsonToolResult({
                ok: true,
                code: "ENV_READY",
                message: `环境设置成功，当前环境: ${selectedEnvId}`,
                current_env_id: selectedEnvId,
                auth_challenge: authChallenge(),
                hint: deviceHint || undefined,
                next_step: buildLoginNextStep("ensure", {
                  suggestedArgs: { action: "ensure" },
                }),
              });
            }

            // Get CLAUDE.md prompt content (skip for CodeBuddy IDE)
            let promptContent = "";
            const currentIde = server.ide || process.env.INTEGRATION_IDE;
            if (currentIde !== "CodeBuddy" && process.env.CLOUDBASE_GUIDE_PROMPT !== "false") {
              try {
                promptContent = await getClaudePrompt();
              } catch (promptError) {
                debug("Failed to get CLAUDE prompt", { error: promptError });
                // Continue with login success even if prompt fetch fails
              }
            }

            const successMessage = `✅ 登录成功，当前环境: ${selectedEnvId}`;
            const promptMessage = promptContent
              ? `\n\n⚠️ 重要提示：后续所有云开发相关的开发工作必须严格遵循以下开发规范和最佳实践：\n\n${promptContent}`
              : "";

            return buildJsonToolResult({
              ok: true,
              code: "READY",
              message: successMessage,
              current_env_id: selectedEnvId,
              auth_challenge: authChallenge(),
              hint: deviceHint || undefined,
              prompt: promptMessage || undefined,
              next_step: buildLoginNextStep("status", {
                suggestedArgs: { action: "status" },
              }),
            });
          }

          throw new Error("登录失败");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return buildJsonToolResult({
          ok: false,
          code: "INTERNAL_ERROR",
          message: `登录失败: ${message}`,
          auth_challenge: authChallenge(),
          next_step: buildLoginNextStep("status", {
            suggestedArgs: { action: "status" },
          }),
        });
      }
    },
  );

  // logout - 退出云开发环境
  server.registerTool?.(
    "logout",
    {
      title: "退出登录",
      description: "退出云开发环境",
      inputSchema: {
        confirm: z.literal("yes").describe("确认操作，默认传 yes"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        category: "env",
      },
    },
    async () => {
      try {
        // 登出账户
        await logout();
        // 清理环境ID缓存
        resetCloudBaseManagerCache();

        return {
          content: [
            {
              type: "text",
              text: "✅ 已退出登录",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `退出失败: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  // envQuery - 环境查询（合并 listEnvs + getEnvInfo + getEnvAuthDomains + getWebsiteConfig）
  server.registerTool?.(
    "envQuery",
    {
      title: "环境查询",
      description:
        "查询云开发环境相关信息，支持查询环境列表、当前环境信息、安全域名和静态网站托管配置。（原工具名：listEnvs/getEnvInfo/getEnvAuthDomains/getWebsiteConfig，为兼容旧AI规则可继续使用这些名称）",
      inputSchema: {
        action: z
          .enum(["list", "info", "domains", "hosting"])
          .describe(
            "查询类型：list=环境列表，info=当前环境信息，domains=安全域名列表，hosting=静态网站托管配置",
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "env",
      },
    },
    async ({ action }: { action: "list" | "info" | "domains" | "hosting" }) => {
      try {
        let result;

        switch (action) {
          case "list":
            try {
              const cloudbaseList = await getCloudBaseManager({
                cloudBaseOptions,
                requireEnvId: true,
                mcpServer: server, // Pass server for IDE detection
              });
              // Use commonService to call DescribeEnvs with filter parameters
              // Filter parameters match the reference conditions provided by user
              result = await cloudbaseList.commonService("tcb", "2018-06-08").call({
                Action: "DescribeEnvs",
                Param: {
                  EnvTypes: ["weda", "baas"], // Include weda and baas (normal) environments
                  IsVisible: false, // Filter out invisible environments
                  Channels: ["dcloud", "iotenable", "tem", "scene_module"], // Filter special channels
                },
              });
              logCloudBaseResult(server.logger, result);
              // Transform response format to match original listEnvs() format
              if (result && result.EnvList) {
                result = { EnvList: result.EnvList };
              } else if (result && result.Data && result.Data.EnvList) {
                result = { EnvList: result.Data.EnvList };
              } else {
                // Fallback to original method if format is unexpected
                debug("Unexpected response format, falling back to listEnvs()");
                result = await cloudbaseList.env.listEnvs();
                logCloudBaseResult(server.logger, result);
              }
              // Apply field simplification for MCP tool response to reduce token consumption
              if (result && Array.isArray(result.EnvList)) {
                result.EnvList = simplifyEnvList(result.EnvList);
              }
            } catch (error) {
              debug("获取环境列表时出错，尝试降级到 listEnvs():", error instanceof Error ? error : new Error(String(error)));
              // Fallback to original method on error
              try {
                const cloudbaseList = await getCloudBaseManager({
                  cloudBaseOptions,
                  requireEnvId: true,
                  mcpServer: server, // Pass server for IDE detection
                });
                result = await cloudbaseList.env.listEnvs();
                logCloudBaseResult(server.logger, result);
                // Apply field simplification for fallback response as well
                if (result && Array.isArray(result.EnvList)) {
                  result.EnvList = simplifyEnvList(result.EnvList);
                }
              } catch (fallbackError) {
                const toolPayloadResult = toolPayloadErrorToResult(fallbackError);
                if (toolPayloadResult) {
                  return toolPayloadResult;
                }
                debug("降级到 listEnvs() 也失败:", fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
                return {
                  content: [
                    {
                      type: "text",
                      text:
                        "获取环境列表时出错: " +
                        (fallbackError instanceof Error
                          ? fallbackError.message
                          : String(fallbackError)),
                    },
                  ],
                };
              }
            }
            if (hasEnvId && result && Array.isArray(result.EnvList) && result.EnvList.length > 1) {
              result.EnvList = result.EnvList.filter((env: any) => env.EnvId === cloudBaseOptions?.envId);
            }
            break;

          case "info":
            const cloudbaseInfo = await getManager();
            result = await cloudbaseInfo.env.getEnvInfo();
            logCloudBaseResult(server.logger, result);
            break;

          case "domains":
            const cloudbaseDomains = await getManager();
            result = await cloudbaseDomains.env.getEnvAuthDomains();
            logCloudBaseResult(server.logger, result);
            break;

          case "hosting":
            const cloudbaseHosting = await getManager();
            result = await cloudbaseHosting.hosting.getWebsiteConfig();
            logCloudBaseResult(server.logger, result);
            break;

          default:
            throw new Error(`不支持的查询类型: ${action}`);
        }

        let responseText = JSON.stringify(result, null, 2);

        // For info action, append CLAUDE.md prompt content (skip for CodeBuddy IDE)
        const currentIde = server.ide || process.env.INTEGRATION_IDE;
        if (action === "info" && currentIde !== "CodeBuddy" && process.env.CLOUDBASE_GUIDE_PROMPT !== "false") {
          try {
            const promptContent = await getClaudePrompt();
            if (promptContent) {
              responseText += `\n\n⚠️ 重要提示：后续所有云开发相关的开发工作必须严格遵循以下开发规范和最佳实践：\n\n${promptContent}`;
            }
          } catch (promptError) {
            debug("Failed to get CLAUDE prompt in envQuery", {
              error: promptError,
            });
            // Continue without prompt if fetch fails
          }
        }

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error) {
        const toolPayloadResult = toolPayloadErrorToResult(error);
        if (toolPayloadResult) {
          return toolPayloadResult;
        }
        return {
          content: [
            {
              type: "text",
              text: `环境查询失败: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  // envDomainManagement - 环境域名管理（合并 createEnvDomain + deleteEnvDomain）
  server.registerTool?.(
    "envDomainManagement",
    {
      title: "环境域名管理",
      description:
        "管理云开发环境的安全域名，支持添加和删除操作。（原工具名：createEnvDomain/deleteEnvDomain，为兼容旧AI规则可继续使用这些名称）",
      inputSchema: {
        action: z
          .enum(["create", "delete"])
          .describe("操作类型：create=添加域名，delete=删除域名"),
        domains: z.array(z.string()).describe("安全域名数组"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false, // 注意：delete操作虽然是破坏性的，但这里采用较宽松的标注
        idempotentHint: false,
        openWorldHint: true,
        category: "env",
      },
    },
    async ({
      action,
      domains,
    }: {
      action: "create" | "delete";
      domains: string[];
    }) => {
      try {
        const cloudbase = await getManager();
        let result;

        switch (action) {
          case "create":
            result = await cloudbase.env.createEnvDomain(domains);
            logCloudBaseResult(server.logger, result);
            break;

          case "delete":
            result = await cloudbase.env.deleteEnvDomain(domains);
            logCloudBaseResult(server.logger, result);
            break;

          default:
            throw new Error(`不支持的操作类型: ${action}`);
        }

        return {
          content: [
            {
              type: "text",
              text: `${JSON.stringify(result, null, 2)}\n\n请注意安全域名需要10分钟才能生效，用户也应该了解这一点。`,
            },
          ],
        };
      } catch (error) {
        const toolPayloadResult = toolPayloadErrorToResult(error);
        if (toolPayloadResult) {
          return toolPayloadResult;
        }
        return {
          content: [
            {
              type: "text",
              text: `域名管理操作失败: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
