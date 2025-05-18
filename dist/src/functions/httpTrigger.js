"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpTrigger = void 0;
const functions_1 = require("@azure/functions");
const discord_interactions_1 = require("discord-interactions");
const node_fetch_1 = require("node-fetch");
const CLIENT_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY;
const START_FUNCTION_URL = process.env.START_FUNCTION_URL; // Azure FunctionのURL (start用)
const STOP_FUNCTION_URL = process.env.STOP_FUNCTION_URL; // Azure FunctionのURL (stop用)
function httpTrigger(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(`Http function processed request for url "${request.url}"`);
        const signature = request.headers.get("x-signature-ed25519");
        const timestamp = request.headers.get("x-signature-timestamp");
        if (!signature || !timestamp) {
            return { status: 401, body: "Missing signature headers" };
        }
        const rawBody = yield request.text();
        // Verify the request signature
        const isValidRequest = (0, discord_interactions_1.verifyKey)(rawBody, signature, timestamp, CLIENT_PUBLIC_KEY);
        if (!isValidRequest) {
            return { status: 401, body: "Invalid request signature" };
        }
        const interaction = JSON.parse(rawBody);
        // Handle the interaction
        if (interaction.type === discord_interactions_1.InteractionType.PING) {
            return {
                status: 200,
                body: JSON.stringify({ type: discord_interactions_1.InteractionResponseType.PONG }),
            };
        }
        if (interaction.type === discord_interactions_1.InteractionType.APPLICATION_COMMAND) {
            const commandName = interaction.data.name;
            if (commandName === "start") {
                // 他のAzure Functionを呼び出す (start)
                try {
                    const response = yield (0, node_fetch_1.default)(START_FUNCTION_URL, { method: "POST" });
                    if (response.ok) {
                        return {
                            status: 200,
                            body: JSON.stringify({
                                type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: {
                                    content: "サーバーを起動しています。数分後にアクセス可能になります。",
                                },
                            }),
                        };
                    }
                    else {
                        context.log(`Failed to call start function: ${response.statusText}`);
                        return {
                            status: 500,
                            body: JSON.stringify({
                                type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: {
                                    content: "サーバーの起動に失敗しました。",
                                },
                            }),
                        };
                    }
                }
                catch (error) {
                    context.log(`Error calling start function: ${error}`);
                    return {
                        status: 500,
                        body: JSON.stringify({
                            type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "サーバーの起動中にエラーが発生しました。",
                            },
                        }),
                    };
                }
            }
            else if (commandName === "stop") {
                // 他のAzure Functionを呼び出す (stop)
                try {
                    const response = yield (0, node_fetch_1.default)(STOP_FUNCTION_URL, { method: "POST" });
                    if (response.ok) {
                        return {
                            status: 200,
                            body: JSON.stringify({
                                type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: {
                                    content: "サーバーを停止しています。しばらくお待ちください。",
                                },
                            }),
                        };
                    }
                    else {
                        context.log(`Failed to call stop function: ${response.statusText}`);
                        return {
                            status: 500,
                            body: JSON.stringify({
                                type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: {
                                    content: "サーバーの停止に失敗しました。",
                                },
                            }),
                        };
                    }
                }
                catch (error) {
                    context.log(`Error calling stop function: ${error}`);
                    return {
                        status: 500,
                        body: JSON.stringify({
                            type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "サーバーの停止中にエラーが発生しました。",
                            },
                        }),
                    };
                }
            }
            else {
                return {
                    status: 200,
                    body: JSON.stringify({
                        type: discord_interactions_1.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: "不明なコマンドです。",
                        },
                    }),
                };
            }
        }
        return { status: 400, body: "Invalid interaction type" };
    });
}
exports.httpTrigger = httpTrigger;
functions_1.app.http("httpTrigger", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: httpTrigger,
});
//# sourceMappingURL=httpTrigger.js.map