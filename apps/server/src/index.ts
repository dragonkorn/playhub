export default {
  async fetch(): Promise<Response> {
    return new Response("PlayHub server");
  },
} satisfies ExportedHandler;
