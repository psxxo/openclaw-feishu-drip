import "node:module";
import { normalizeAccountId } from "openclaw/plugin-sdk/account-id";
import { ContextVisibilityModeSchema, DmPolicySchema, GroupPolicySchema, ReplyToModeSchema, buildChannelConfigSchema, buildGroupEntrySchema, buildMultiAccountChannelSchema } from "openclaw/plugin-sdk/channel-config-schema";
import { buildSecretInputSchema, hasConfiguredSecretInput } from "openclaw/plugin-sdk/secret-input";
import { z } from "zod";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
//#endregion
//#region extensions/feishu/src/external-keys.ts
const FEISHU_EXTERNAL_KEY_PATTERN = /^(?!\s)(?![\s\S]*\s$)(?![\s\S]*\.\.)[^\p{Cc}\p{Cs}/\\]{1,512}$/u;
function normalizeFeishuExternalKey(value) {
	if (typeof value !== "string") return;
	const normalized = value.trim();
	return FEISHU_EXTERNAL_KEY_PATTERN.test(normalized) ? normalized : void 0;
}
//#endregion
//#region extensions/feishu/src/webhook-path.ts
const DEFAULT_FEISHU_WEBHOOK_PATH = "/feishu/events";
/** Normalize trusted configuration only; incoming request targets must remain unmodified. */
function normalizeFeishuWebhookPath(value) {
	const configured = value?.trim();
	if (!configured) return DEFAULT_FEISHU_WEBHOOK_PATH;
	try {
		const parsed = new URL(configured, "http://localhost");
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
		const emptyQuery = !parsed.search && parsed.href.endsWith("?") && !configured.includes("#") ? "?" : "";
		return `${parsed.pathname}${parsed.search}${emptyQuery}`;
	} catch {
		return null;
	}
}
//#endregion
//#region extensions/feishu/src/config-schema.ts
const ChannelActionsSchema = z.object({
	reactions: z.boolean().optional(),
	sticker: z.boolean().optional()
}).strict().optional();
const MAX_STICKER_SETS = 32;
const MAX_STICKERS_PER_SET = 256;
function canonicalTextPattern(maxLength) {
	return new RegExp(`^(?!\\s)(?![\\s\\S]*\\s$)[^\\p{Cs}]{1,${maxLength}}$`, "u");
}
const FeishuStickerSetSchema = z.record(z.string().regex(FEISHU_EXTERNAL_KEY_PATTERN), z.array(z.string().regex(canonicalTextPattern(64))).min(1).max(8)).refine((set) => Object.keys(set).length <= MAX_STICKERS_PER_SET, { message: `At most ${MAX_STICKERS_PER_SET} stickers per bot set are allowed` }).meta({ maxProperties: MAX_STICKERS_PER_SET });
const FeishuStickerSetsSchema = z.record(z.string().regex(canonicalTextPattern(128)), FeishuStickerSetSchema).refine((sets) => Object.keys(sets).length <= MAX_STICKER_SETS, { message: `At most ${MAX_STICKER_SETS} bot sticker sets are allowed` }).meta({ maxProperties: MAX_STICKER_SETS });
const FeishuGroupPolicySchema = z.union([GroupPolicySchema, z.literal("allowall").transform(() => "open")]);
const FeishuDomainSchema = z.union([z.enum(["feishu", "lark"]), z.string().regex(/^[Hh][Tt][Tt][Pp][Ss]:\/\//).url()]);
const FeishuConnectionModeSchema = z.enum(["websocket", "webhook"]);
const FeishuWebhookPathSchema = z.string().refine((value) => normalizeFeishuWebhookPath(value) === value, { message: "webhookPath must be a canonical HTTP request path; run \"openclaw doctor --fix\" to repair it" });
const TtsOverrideSchema = z.object({
	auto: z.enum([
		"off",
		"always",
		"inbound",
		"tagged"
	]).optional(),
	enabled: z.boolean().optional(),
	mode: z.enum(["final", "all"]).optional(),
	provider: z.string().optional(),
	persona: z.string().optional(),
	personas: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
	summaryModel: z.string().optional(),
	modelOverrides: z.record(z.string(), z.unknown()).optional(),
	providers: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
	prefsPath: z.string().optional(),
	maxTextLength: z.number().int().min(1).optional(),
	timeoutMs: z.number().int().min(1e3).max(12e4).optional()
}).strict().optional();
const ToolPolicySchema = z.object({
	allow: z.array(z.string()).optional(),
	deny: z.array(z.string()).optional()
}).strict().optional();
const DmConfigSchema = z.object({
	enabled: z.boolean().optional(),
	systemPrompt: z.string().optional()
}).strict().optional();
const MarkdownConfigSchema = z.object({
	mode: z.enum([
		"native",
		"escape",
		"strip"
	]).optional(),
	tableMode: z.enum([
		"native",
		"ascii",
		"simple"
	]).optional()
}).strict().optional();
const RenderModeSchema = z.enum([
	"auto",
	"raw",
	"card"
]).optional();
const BlockStreamingCoalesceSchema = z.object({
	minChars: z.number().int().positive().optional(),
	maxChars: z.number().int().positive().optional(),
	idleMs: z.number().int().nonnegative().optional()
}).strict().optional();
const FeishuStreamingSchema = z.object({
	mode: z.enum(["off", "partial"]).optional(),
	chunkMode: z.enum(["length", "newline"]).optional(),
	block: z.object({
		enabled: z.boolean().optional(),
		coalesce: BlockStreamingCoalesceSchema
	}).strict().optional()
}).strict().optional();
const ChannelHeartbeatVisibilitySchema = z.object({
	visibility: z.enum(["visible", "hidden"]).optional(),
	intervalMs: z.number().int().positive().optional()
}).strict().optional();
/**
* Dynamic agent creation configuration.
* When enabled, a new agent is created for each unique DM user.
*/
const DynamicAgentCreationSchema = z.object({
	enabled: z.boolean().optional(),
	workspaceTemplate: z.string().optional(),
	agentDirTemplate: z.string().optional(),
	maxAgents: z.number().int().positive().optional()
}).strict().optional();
/**
* Feishu tools configuration.
* Controls which tool categories are enabled.
*
* Dependencies:
* - wiki requires doc (wiki content is edited via doc tools)
* - perm can work independently but is typically used with drive
*/
const FeishuToolsConfigSchema = z.object({
	doc: z.boolean().optional(),
	chat: z.boolean().optional(),
	wiki: z.boolean().optional(),
	drive: z.boolean().optional(),
	perm: z.boolean().optional(),
	scopes: z.boolean().optional(),
	bitable: z.boolean().optional()
}).strict().optional();
/**
* Group session scope for routing Feishu group messages.
* - "group" (default): one session per group chat
* - "group_sender": one session per (group + sender)
* - "group_topic": one session per group topic thread (falls back to group if no topic)
* - "group_topic_sender": one session per (group + topic thread + sender),
*   falls back to (group + sender) if no topic
*/
const GroupSessionScopeSchema = z.enum([
	"group",
	"group_sender",
	"group_topic",
	"group_topic_sender"
]).optional();
/**
* @deprecated Use groupSessionScope instead.
*
* Topic session isolation mode for group chats.
* - "disabled" (default): All messages in a group share one session
* - "enabled": Messages in different topics get separate sessions
*
* Topic routing uses Feishu topic-group `thread_id` when the event identifies a
* native topic group, and keeps `root_id` precedence for normal groups so
* reply-created threads stay on the initiating message session.
*/
const TopicSessionModeSchema = z.enum(["disabled", "enabled"]).optional();
const ReactionNotificationModeSchema = z.enum([
	"off",
	"own",
	"all"
]).optional();
/**
* Reply-in-thread mode for group chats.
* - "disabled" (default): Bot replies are normal inline replies
* - "enabled": Bot replies create or continue a Feishu topic thread
*
* When enabled, the Feishu reply API is called with `reply_in_thread: true`,
* causing the reply to appear as a topic (话题) under the original message.
*/
const ReplyInThreadSchema = z.enum(["disabled", "enabled"]).optional();
const RequireMentionInBotThreadsSchema = z.boolean().optional().describe("Require mentions in threads started by this bot. False permits unmentioned messages; true requires a mention. Omit to preserve existing mention behavior.");
const FeishuGroupSchema = buildGroupEntrySchema({
	tools: ToolPolicySchema,
	requireMentionInBotThreads: RequireMentionInBotThreadsSchema,
	groupSessionScope: GroupSessionScopeSchema,
	topicSessionMode: TopicSessionModeSchema,
	replyInThread: ReplyInThreadSchema
}).omit({ toolsBySender: true });
const FeishuSharedConfigShape = {
	legacyWebhook: z.object({
		port: z.number().int().min(1).max(65535),
		host: z.string().optional()
	}).strict().or(z.literal(false)).optional(),
	capabilities: z.array(z.string()).optional(),
	markdown: MarkdownConfigSchema,
	configWrites: z.boolean().optional(),
	contextVisibility: ContextVisibilityModeSchema.optional(),
	replyToMode: ReplyToModeSchema.optional(),
	responsePrefix: z.string().optional(),
	dmPolicy: DmPolicySchema.optional(),
	allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
	groupPolicy: FeishuGroupPolicySchema.optional(),
	groupAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
	groupSenderAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
	requireMention: z.boolean().optional(),
	requireMentionInBotThreads: RequireMentionInBotThreadsSchema,
	groups: z.record(z.string(), FeishuGroupSchema.optional()).optional(),
	historyLimit: z.number().int().min(0).optional(),
	dmHistoryLimit: z.number().int().min(0).optional(),
	dms: z.record(z.string(), DmConfigSchema).optional(),
	textChunkLimit: z.number().int().positive().optional(),
	mediaMaxMb: z.number().positive().optional(),
	httpTimeoutMs: z.number().int().positive().max(3e5).optional(),
	heartbeatVisibility: ChannelHeartbeatVisibilitySchema,
	renderMode: RenderModeSchema,
	streaming: FeishuStreamingSchema,
	tools: FeishuToolsConfigSchema,
	actions: ChannelActionsSchema,
	replyInThread: ReplyInThreadSchema,
	reactionNotifications: ReactionNotificationModeSchema,
	typingIndicator: z.boolean().optional(),
	resolveSenderNames: z.boolean().optional(),
	allowBots: z.boolean().optional(),
	vcAutoJoin: z.boolean().optional(),
	tts: TtsOverrideSchema
};
/**
* Per-account configuration.
* All fields are optional - missing fields inherit from top-level config.
*/
const FeishuAccountConfigSchema = z.object({
	enabled: z.boolean().optional(),
	name: z.string().optional(),
	appId: z.string().optional(),
	appSecret: buildSecretInputSchema().optional(),
	encryptKey: buildSecretInputSchema().optional(),
	verificationToken: buildSecretInputSchema().optional(),
	domain: FeishuDomainSchema.optional(),
	connectionMode: FeishuConnectionModeSchema.optional(),
	webhookPath: FeishuWebhookPathSchema.optional(),
	...FeishuSharedConfigShape,
	groupSessionScope: GroupSessionScopeSchema,
	topicSessionMode: TopicSessionModeSchema
}).strict();
const FeishuConfigSchemaBase = z.object({
	enabled: z.boolean().optional(),
	defaultAccount: z.string().optional(),
	stickerSets: FeishuStickerSetsSchema.optional(),
	appId: z.string().optional(),
	appSecret: buildSecretInputSchema().optional(),
	encryptKey: buildSecretInputSchema().optional(),
	verificationToken: buildSecretInputSchema().optional(),
	domain: FeishuDomainSchema.optional().default("feishu"),
	connectionMode: FeishuConnectionModeSchema.optional().default("websocket"),
	webhookPath: FeishuWebhookPathSchema.optional().default(DEFAULT_FEISHU_WEBHOOK_PATH),
	...FeishuSharedConfigShape,
	dmPolicy: DmPolicySchema.optional().default("pairing"),
	reactionNotifications: ReactionNotificationModeSchema.optional().default("own"),
	groupPolicy: FeishuGroupPolicySchema.optional().default("allowlist"),
	requireMention: z.boolean().optional(),
	groupSessionScope: GroupSessionScopeSchema,
	topicSessionMode: TopicSessionModeSchema,
	dynamicAgentCreation: DynamicAgentCreationSchema,
	typingIndicator: z.boolean().optional().default(true),
	resolveSenderNames: z.boolean().optional().default(true)
}).strict();
const FeishuConfigSchema = buildMultiAccountChannelSchema(FeishuConfigSchemaBase, {
	accountSchema: FeishuAccountConfigSchema,
	optionalAccount: true
}).superRefine((value, ctx) => {
	const defaultAccount = value.defaultAccount?.trim();
	if (defaultAccount && value.accounts && Object.keys(value.accounts).length > 0) {
		const normalizedDefaultAccount = normalizeAccountId(defaultAccount);
		if (!Object.hasOwn(value.accounts, normalizedDefaultAccount)) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["defaultAccount"],
			message: `channels.feishu.defaultAccount="${defaultAccount}" does not match a configured account key`
		});
	}
	const defaultConnectionMode = value.connectionMode ?? "websocket";
	const defaultVerificationTokenConfigured = hasConfiguredSecretInput(value.verificationToken);
	const defaultEncryptKeyConfigured = hasConfiguredSecretInput(value.encryptKey);
	if (defaultConnectionMode === "webhook") {
		if (!defaultVerificationTokenConfigured) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["verificationToken"],
			message: "channels.feishu.connectionMode=\"webhook\" requires channels.feishu.verificationToken"
		});
		if (!defaultEncryptKeyConfigured) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["encryptKey"],
			message: "channels.feishu.connectionMode=\"webhook\" requires channels.feishu.encryptKey"
		});
	}
	for (const [accountId, account] of Object.entries(value.accounts ?? {})) {
		if (!account) continue;
		if ((account.connectionMode ?? defaultConnectionMode) !== "webhook") continue;
		const accountVerificationTokenConfigured = hasConfiguredSecretInput(account.verificationToken) || defaultVerificationTokenConfigured;
		const accountEncryptKeyConfigured = hasConfiguredSecretInput(account.encryptKey) || defaultEncryptKeyConfigured;
		if (!accountVerificationTokenConfigured) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [
				"accounts",
				accountId,
				"verificationToken"
			],
			message: `channels.feishu.accounts.${accountId}.connectionMode="webhook" requires a verificationToken (account-level or top-level)`
		});
		if (!accountEncryptKeyConfigured) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [
				"accounts",
				accountId,
				"encryptKey"
			],
			message: `channels.feishu.accounts.${accountId}.connectionMode="webhook" requires an encryptKey (account-level or top-level)`
		});
	}
	if (value.dmPolicy === "open") {
		if (!(value.allowFrom ?? []).some((entry) => String(entry).trim() === "*")) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["allowFrom"],
			message: "channels.feishu.dmPolicy=\"open\" requires channels.feishu.allowFrom to include \"*\""
		});
	}
});
const FeishuChannelConfigSchema = buildChannelConfigSchema(FeishuConfigSchema, { jsonSchemaMode: "input" });
//#endregion
//#region packages/normalization-core/src/record-coerce.ts
/** Type guard for non-array object records at browser-safe boundaries. */
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Returns a non-array record or null. */
function asNullableRecord(value) {
	return isRecord(value) ? value : null;
}
//#endregion
//#region src/config/channel-config-normalization.ts
/** Applies one channel-specific doctor migration to every object-shaped account. */
function normalizeChannelAccounts(params) {
	const rawAccounts = asNullableRecord(params.entry.accounts);
	if (!rawAccounts) return {
		entry: params.entry,
		changed: false
	};
	let changed = false;
	const accounts = { ...rawAccounts };
	for (const [accountId, value] of Object.entries(rawAccounts)) {
		const account = asNullableRecord(value);
		if (!account) continue;
		const normalized = params.normalizeAccount({
			account,
			accountId,
			pathPrefix: `${params.pathPrefix}.accounts.${accountId}`,
			changes: params.changes
		});
		if (normalized.changed) {
			accounts[accountId] = normalized.entry;
			changed = true;
		}
	}
	return changed ? {
		entry: {
			...params.entry,
			accounts
		},
		changed: true
	} : {
		entry: params.entry,
		changed: false
	};
}
/** Applies the same channel-specific doctor migration at root and account scope. */
function normalizeChannelConfigEntries$1(params) {
	const changes = params.changes ?? [];
	const channels = params.cfg.channels;
	const entry = asNullableRecord(channels?.[params.channelId]);
	if (!entry) return {
		config: params.cfg,
		changes
	};
	const channelPath = `channels.${params.channelId}`;
	const root = params.normalizeEntry({
		entry,
		pathPrefix: channelPath,
		changes
	});
	const accounts = normalizeChannelAccounts({
		entry: root.entry,
		pathPrefix: channelPath,
		changes,
		normalizeAccount: (accountParams) => params.normalizeEntry({
			entry: accountParams.account,
			accountId: accountParams.accountId,
			pathPrefix: accountParams.pathPrefix,
			changes: accountParams.changes
		})
	});
	if (!root.changed && !accounts.changed) return {
		config: params.cfg,
		changes
	};
	return {
		config: {
			...params.cfg,
			channels: {
				...channels,
				[params.channelId]: accounts.entry
			}
		},
		changes
	};
}
//#endregion
//#region src/plugin-sdk/legacy-webhook-listener-migration.ts
/** Preserve explicitly configured webhook listeners while moving ingress onto Gateway routes. */
function createLegacyWebhookListenerDoctorContract(params) {
	const portKey = params.portKey ?? "webhookPort";
	const hostKey = params.hostKey === void 0 ? "webhookHost" : params.hostKey;
	const source = (entry) => params.webhookKey ? asNullableRecord(entry[params.webhookKey]) : entry;
	const hasLegacy = (value) => {
		const entry = asNullableRecord(value);
		const listener = entry && source(entry);
		return Boolean(listener && (Object.hasOwn(listener, portKey) || hostKey && Object.hasOwn(listener, hostKey)));
	};
	const prefix = `channels.${params.channelKey}`;
	return {
		legacyConfigRules: [{
			path: ["channels", params.channelKey],
			message: `${prefix} webhook listeners moved to Gateway routes. Run "openclaw doctor --fix" to preserve explicitly configured listener settings as legacyWebhook.`,
			match: (value) => {
				const accounts = asNullableRecord(asNullableRecord(value)?.accounts);
				return hasLegacy(value) || Object.values(accounts ?? {}).some(hasLegacy);
			}
		}],
		normalizeCompatibilityConfig: ({ cfg }) => {
			const root = asNullableRecord(asNullableRecord(cfg.channels)?.[params.channelKey]);
			const inherited = root && source(root);
			const canonicalRoot = asNullableRecord(root?.legacyWebhook);
			return normalizeChannelConfigEntries$1({
				cfg,
				channelId: params.channelKey,
				normalizeEntry: ({ entry, accountId, pathPrefix, changes }) => {
					const listener = source(entry);
					if (!listener || !hasLegacy(entry)) return {
						entry,
						changed: false
					};
					const next = { ...entry };
					const port = Object.hasOwn(listener, portKey) ? listener[portKey] : (accountId ? canonicalRoot?.port ?? inherited?.[portKey] : void 0) ?? params.defaultPort;
					const inheritedHost = accountId ? canonicalRoot ? canonicalRoot.host : (hostKey ? inherited?.[hostKey] : void 0) ?? params.defaultHost : params.defaultHost;
					const host = hostKey ? listener[hostKey] ?? inheritedHost : inheritedHost;
					const legacyPath = [pathPrefix, params.webhookKey].filter(Boolean).join(".");
					if (Object.hasOwn(entry, "legacyWebhook")) changes.push(`Removed ${legacyPath} legacy listener keys; ${pathPrefix}.legacyWebhook is already configured.`);
					else if (accountId && root?.legacyWebhook === false) changes.push(`Removed ${legacyPath} legacy listener keys; ${prefix}.legacyWebhook: false keeps this account's inherited listener disabled.`);
					else {
						next.legacyWebhook = {
							port,
							...host !== void 0 ? { host } : {}
						};
						changes.push(`Moved ${legacyPath} listener settings to ${pathPrefix}.legacyWebhook. Point the external callback or reverse proxy at the Gateway port and webhook path, verify delivery, then set legacyWebhook: false to disable legacy forwarding.`);
					}
					const updated = params.webhookKey ? { ...listener } : next;
					delete updated[portKey];
					if (hostKey) delete updated[hostKey];
					if (params.webhookKey) {
						if (Object.keys(updated).length) next[params.webhookKey] = updated;
						else delete next[params.webhookKey];
					}
					return {
						entry: next,
						changed: true
					};
				}
			});
		}
	};
}
//#endregion
//#region \0openclaw:bundled-sdk:openclaw/plugin-sdk/runtime-doctor-migrations
var runtime_doctor_migrations_exports = /* @__PURE__ */ __exportAll({ createLegacyWebhookListenerDoctorContract: () => createLegacyWebhookListenerDoctorContract });
import * as import_openclaw_plugin_sdk_runtime_doctor_migrations from "openclaw/plugin-sdk/runtime-doctor-migrations";
__reExport(runtime_doctor_migrations_exports, import_openclaw_plugin_sdk_runtime_doctor_migrations);
//#endregion
//#region extensions/feishu/src/doctor-contract.ts
const webhookListenerMigration = createLegacyWebhookListenerDoctorContract({
	channelKey: "feishu",
	defaultPort: 3e3,
	defaultHost: "127.0.0.1"
});
const streamingAliasMigration = (0, runtime_doctor_migrations_exports.defineChannelAliasMigration)({
	channelId: "feishu",
	streaming: { defaultMode: "partial" },
	accountStreamingReplacesRoot: true
});
const LEGACY_COALESCE_FIELDS = [
	"enabled",
	"minDelayMs",
	"maxDelayMs"
];
const LEGACY_HEARTBEAT_FIELDS = ["visibility", "intervalMs"];
const toolsBaseMigration = (0, runtime_doctor_migrations_exports.defineKeyMoveMigration)({
	from: ["tools", "base"],
	to: ["tools", "bitable"],
	match: (value) => typeof value === "boolean",
	sourceOwn: false
});
function sanitizeLegacyHeartbeatFields(params) {
	const heartbeat = (0, runtime_doctor_migrations_exports.asObjectRecord)(params.entry.heartbeat);
	if (!heartbeat || Object.keys(heartbeat).length > 0 && !LEGACY_HEARTBEAT_FIELDS.some((field) => Object.hasOwn(heartbeat, field))) return {
		entry: params.entry,
		changed: false
	};
	const next = { ...params.entry };
	delete next.heartbeat;
	params.changes.push(`Removed ${params.pathPrefix}.heartbeat (legacy Feishu fields were never read by runtime).`);
	return {
		entry: next,
		changed: true
	};
}
function sanitizeLegacyCoalesceFields(params) {
	const streaming = (0, runtime_doctor_migrations_exports.asObjectRecord)(params.entry.streaming);
	const block = (0, runtime_doctor_migrations_exports.asObjectRecord)(streaming?.block);
	const coalesce = (0, runtime_doctor_migrations_exports.asObjectRecord)(block?.coalesce);
	if (!streaming || !block || !coalesce) return {
		entry: params.entry,
		changed: false
	};
	const removed = LEGACY_COALESCE_FIELDS.filter((field) => coalesce[field] !== void 0);
	if (removed.length === 0) return {
		entry: params.entry,
		changed: false
	};
	const nextCoalesce = { ...coalesce };
	for (const field of removed) delete nextCoalesce[field];
	params.changes.push(`Removed ${params.pathPrefix}.streaming.block.coalesce.{${removed.join(",")}} (legacy Feishu-only fields; block delivery reads minChars/maxChars/idleMs).`);
	return {
		entry: {
			...params.entry,
			streaming: {
				...streaming,
				block: {
					...block,
					coalesce: nextCoalesce
				}
			}
		},
		changed: true
	};
}
function hasLegacyWebhookPath(value) {
	const path = (0, runtime_doctor_migrations_exports.asObjectRecord)(value)?.webhookPath;
	return typeof path === "string" && normalizeFeishuWebhookPath(path) !== path;
}
function normalizeLegacyWebhookPath(params) {
	const path = params.entry.webhookPath;
	if (typeof path !== "string") return {
		entry: params.entry,
		changed: false
	};
	const normalized = normalizeFeishuWebhookPath(path);
	const canonical = normalized ?? "/feishu/events";
	if (canonical === path) return {
		entry: params.entry,
		changed: false
	};
	params.changes.push(normalized === null ? `Reset invalid ${params.pathPrefix}.webhookPath to ${DEFAULT_FEISHU_WEBHOOK_PATH}.` : `Normalized ${params.pathPrefix}.webhookPath to its HTTP request path.`);
	return {
		entry: {
			...params.entry,
			webhookPath: canonical
		},
		changed: true
	};
}
function normalizeFeishuLegacyConfigEntries(cfg, changes) {
	return (0, runtime_doctor_migrations_exports.normalizeChannelConfigEntries)({
		cfg,
		channelId: "feishu",
		changes,
		normalizeEntry: (params) => {
			const tools = toolsBaseMigration.normalize(params);
			const coalesce = sanitizeLegacyCoalesceFields({
				...params,
				entry: tools.entry
			});
			const heartbeat = sanitizeLegacyHeartbeatFields({
				...params,
				entry: coalesce.entry
			});
			const webhook = normalizeLegacyWebhookPath({
				...params,
				entry: heartbeat.entry
			});
			return {
				entry: webhook.entry,
				changed: tools.changed || coalesce.changed || heartbeat.changed || webhook.changed
			};
		}
	}).config;
}
const feishuStrayEntryConfigMigration = (0, runtime_doctor_migrations_exports.defineStrayPluginEntryConfigMigration)({
	pluginId: "feishu",
	channelId: "feishu",
	validateMergedChannelConfig: (merged) => FeishuConfigSchema.safeParse(merged).success
});
const legacyConfigRules = [
	...streamingAliasMigration.legacyConfigRules,
	...webhookListenerMigration.legacyConfigRules,
	feishuStrayEntryConfigMigration.legacyConfigRule,
	{
		path: ["channels", "feishu"],
		message: "channels.feishu[.accounts.<id>].webhookPath must be a canonical HTTP request path; run \"openclaw doctor --fix\".",
		match: (value) => {
			const entry = (0, runtime_doctor_migrations_exports.asObjectRecord)(value);
			return hasLegacyWebhookPath(entry) || (0, runtime_doctor_migrations_exports.hasLegacyAccountStreamingAliases)(entry?.accounts, hasLegacyWebhookPath);
		}
	},
	{
		path: ["channels", "feishu"],
		message: "channels.feishu[.accounts.<id>].tools.base is legacy; use tools.bitable. Run \"openclaw doctor --fix\".",
		match: (value) => {
			const entry = (0, runtime_doctor_migrations_exports.asObjectRecord)(value);
			return toolsBaseMigration.hasLegacy(entry) || (0, runtime_doctor_migrations_exports.hasLegacyAccountStreamingAliases)(entry?.accounts, toolsBaseMigration.hasLegacy);
		}
	}
];
function normalizeCompatibilityConfig({ cfg }) {
	const aliases = streamingAliasMigration.normalizeChannelConfig({ cfg });
	const listener = webhookListenerMigration.normalizeCompatibilityConfig({ cfg: aliases.config });
	const changes = [...aliases.changes, ...listener.changes];
	const entries = normalizeFeishuLegacyConfigEntries(listener.config, changes);
	const stray = feishuStrayEntryConfigMigration.normalizeConfig({ cfg: entries });
	return {
		config: stray.config,
		changes: [...changes, ...stray.changes]
	};
}
//#endregion
export { normalizeFeishuWebhookPath as a, __reExport as c, DEFAULT_FEISHU_WEBHOOK_PATH as i, normalizeCompatibilityConfig as n, normalizeFeishuExternalKey as o, FeishuChannelConfigSchema as r, __exportAll as s, legacyConfigRules as t };
