import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";
import fetch from "node-fetch";

const CLIENT_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY!;
const START_FUNCTION_URL = process.env.START_FUNCTION_URL!; // Azure FunctionのURL (start用)
const STOP_FUNCTION_URL = process.env.STOP_FUNCTION_URL!; // Azure FunctionのURL (stop用)

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");

    if (!signature || !timestamp) {
        return { status: 401, body: "Missing signature headers" };
    }

    const rawBody = await request.text();

    // Verify the request signature
    const isValidRequest = verifyKey(rawBody, signature, timestamp, CLIENT_PUBLIC_KEY);
    if (!isValidRequest) {
        return { status: 401, body: "Invalid request signature" };
    }

    const interaction = JSON.parse(rawBody);

    // Handle the interaction
    if (interaction.type === InteractionType.PING) {
        return {
            status: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
        };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const commandName = interaction.data.name;

        if (commandName === "start") {
            // 他のAzure Functionを呼び出す (start)
            try {
                const response = await fetch(START_FUNCTION_URL, { method: "POST" });
                if (response.ok) {
                    return {
                        status: 200,
                        body: JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "サーバーを起動しています。数分後にアクセス可能になります。",
                            },
                        }),
                    };
                } else {
                    context.log(`Failed to call start function: ${response.statusText}`);
                    return {
                        status: 500,
                        body: JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "サーバーの起動に失敗しました。",
                            },
                        }),
                    };
                }
            } catch (error) {
                context.log(`Error calling start function: ${error}`);
                return {
                    status: 500,
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: "サーバーの起動中にエラーが発生しました。",
                        },
                    }),
                };
            }
        } else if (commandName === "stop") {
            // 他のAzure Functionを呼び出す (stop)
            try {
                const response = await fetch(STOP_FUNCTION_URL, { method: "POST" });
                if (response.ok) {
                    return {
                        status: 200,
                        body: JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "サーバーを停止しています。しばらくお待ちください。",
                            },
                        }),
                    };
                } else {
                    context.log(`Failed to call stop function: ${response.statusText}`);
                    return {
                        status: 500,
                        body: JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "サーバーの停止に失敗しました。",
                            },
                        }),
                    };
                }
            } catch (error) {
                context.log(`Error calling stop function: ${error}`);
                return {
                    status: 500,
                    body: JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: "サーバーの停止中にエラーが発生しました。",
                        },
                    }),
                };
            }
        } else {
            return {
                status: 200,
                body: JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: "不明なコマンドです。",
                    },
                }),
            };
        }
    }

    return { status: 400, body: "Invalid interaction type" };
}

app.http("httpTrigger", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: httpTrigger,
});