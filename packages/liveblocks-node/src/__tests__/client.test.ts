import type {
  CommentData,
  CommentUserReaction,
  IdTuple,
  NotificationSettingsPlain,
  RoomSubscriptionSettings,
  SerializedCrdt,
  ThreadData,
} from "@liveblocks/core";
import { createNotificationSettings, LiveList } from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { Liveblocks, LiveblocksError } from "../client";
import { getBaseUrl } from "../utils";

const DEFAULT_BASE_URL = getBaseUrl();

describe("client", () => {
  const room = {
    type: "room",
    id: "react-todo-list",
    lastConnectionAt: new Date("2022-08-04T21:07:09.380Z"),
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    metadata: {
      color: "blue",
      size: "10",
      target: ["abc", "def"],
    },
    defaultAccesses: ["room:write"],
    groupsAccesses: {
      marketing: ["room:write"],
    },
    usersAccesses: {
      alice: ["room:write"],
      vinod: ["room:write"],
    },
  };

  const activeUsers = [
    {
      type: "user",
      id: "alice",
      connectionId: 123,
      info: {
        name: "Alice",
      },
    },
  ];

  const comment: CommentData = {
    type: "comment",
    id: "comment1",
    roomId: "room1",
    threadId: "thread1",
    userId: "user1",
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    attachments: [],
    reactions: [
      {
        emoji: "🐐",
        createdAt: new Date("2022-07-13T14:32:50.697Z"),
        users: [{ id: "user1" }],
      },
    ],
    body: {
      version: 1,
      content: [],
    },
  };

  const thread: ThreadData<{
    color: string;
  }> = {
    type: "thread",
    id: "thread1",
    roomId: "room1",
    metadata: {
      color: "blue",
    },
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    updatedAt: new Date("2022-07-13T14:32:50.697Z"),
    comments: [comment],
    resolved: false,
  };

  const reaction: CommentUserReaction = {
    emoji: "🐐",
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    userId: "user1",
  };

  const server = setupServer(
    http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
      return HttpResponse.json(
        {
          nextCursor: "1",
          data: [room],
        },
        { status: 200 }
      );
    }),
    http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId`, () => {
      return HttpResponse.json(room, { status: 200 });
    }),
    http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/active_users`, () => {
      return HttpResponse.json({
        data: activeUsers,
      });
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("LiveblocksError message formatting", () => {
    test("should throw a LiveblocksError when response is missing a body", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
          return new HttpResponse(null, { status: 499 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        await client.getRooms();
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(LiveblocksError);
        if (err instanceof LiveblocksError) {
          expect(err.name).toBe("LiveblocksError");
          expect(err.status).toBe(499);
          expect(err.message).toBe(
            "An error happened without an error message"
          );
        }
      }
    });
    test("should throw a LiveblocksError when response has empty body", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
          return HttpResponse.text("", { status: 499 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        await client.getRooms();
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(LiveblocksError);
        if (err instanceof LiveblocksError) {
          expect(err.name).toBe("LiveblocksError");
          expect(err.status).toBe(499);
          expect(err.message).toBe(
            "An error happened without an error message"
          );
        }
      }
    });
    test("should throw a LiveblocksError when response has non-JSON body", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
          return HttpResponse.text("I'm not a JSON response", { status: 499 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        await client.getRooms();
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(LiveblocksError);
        if (err instanceof LiveblocksError) {
          expect(err.name).toBe("LiveblocksError");
          expect(err.status).toBe(499);
          expect(err.message).toBe("I'm not a JSON response");
          expect(String(err)).toBe(
            "LiveblocksError: I'm not a JSON response (status 499)"
          );
          expect(err.toString()).toBe(
            "LiveblocksError: I'm not a JSON response (status 499)"
          );
        }
      }
    });
    test("should throw a LiveblocksError when response has JSON body without a message field", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
          return HttpResponse.json(
            { messsag: 'Misspelled "message" field' },
            { status: 499 }
          );
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        await client.getRooms();
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(LiveblocksError);
        if (err instanceof LiveblocksError) {
          expect(err.name).toBe("LiveblocksError");
          expect(err.status).toBe(499);
          expect(err.message).toBe(
            "An error happened without an error message"
          );
        }
      }
    });
  });
  describe("get rooms", () => {
    test("should return a list of room when getRooms receives a successful response", async () => {
      const client = new Liveblocks({ secret: "sk_xxx" });
      await expect(client.getRooms()).resolves.toEqual({
        nextCursor: "1",
        data: [room],
      });
    });

    test("should return a list of room when getRooms with additional params receives a successful response", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.size).toEqual(5);
          expect(url.searchParams.get("limit")).toEqual("10");
          expect(url.searchParams.get("startingAfter")).toEqual("2");
          expect(url.searchParams.get("query")).toEqual(
            "roomId^'liveblocks:' metadata['color']:'blue'"
          );
          expect(url.searchParams.get("userId")).toEqual("user1");
          expect(url.searchParams.get("groupIds")).toEqual("group1");

          return HttpResponse.json(
            {
              nextCursor: "3",
              data: [room],
            },
            { status: 200 }
          );
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getRooms({
          limit: 10,
          startingAfter: "2",
          query: {
            roomId: {
              startsWith: "liveblocks:",
            },
            metadata: {
              color: "blue",
            },
          },
          userId: "user1",
          groupIds: ["group1"],
        })
      ).resolves.toEqual({
        nextCursor: "3",
        data: [room],
      });
    });

    test("should return a list of room when getRooms with query params receives a successful response", async () => {
      const expectedQuery =
        "roomId^'liveblocks:' metadata['color']:'blue' metadata['size']:'10'";

      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, (res) => {
          const url = new URL(res.request.url);

          expect(url.searchParams.size).toEqual(1);
          expect(url.searchParams.get("query")).toEqual(expectedQuery);
          return HttpResponse.json(
            {
              nextCursor: "1",
              data: [room],
            },
            { status: 200 }
          );
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getRooms({
          query: expectedQuery,
        })
      ).resolves.toEqual({
        nextCursor: "1",
        data: [room],
      });

      await expect(
        client.getRooms({
          query: {
            metadata: {
              color: "blue",
              size: "10",
            },
            roomId: {
              startsWith: "liveblocks:",
            },
          },
        })
      ).resolves.toEqual({
        nextCursor: "1",
        data: [room],
      });
    });

    test("should return a list of room when getRooms with partial params receives a successful response", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.size).toEqual(2);
          expect(url.searchParams.get("limit")).toEqual("10");
          expect(url.searchParams.get("startingAfter")).toEqual(null);
          expect(url.searchParams.get("query")).toEqual(
            "metadata['color']:'blue'"
          );
          expect(url.searchParams.get("userId")).toEqual(null);
          expect(url.searchParams.get("groupIds")).toEqual(null);

          return HttpResponse.json(
            {
              nextCursor: "1",
              data: [room],
            },
            { status: 200 }
          );
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getRooms({
          limit: 10,
          query: {
            metadata: {
              color: "blue",
            },
          },
        })
      ).resolves.toEqual({
        nextCursor: "1",
        data: [room],
      });
    });

    test("should throw a LiveblocksError when getRooms receives an error response", async () => {
      const error = {
        error: "INVALID_SECRET_KEY",
        message: "Invalid secret key",
      };

      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
          return HttpResponse.json(error, { status: 404 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getRooms({
          limit: 10,
          query: {
            metadata: {
              color: "blue",
            },
          },
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Invalid secret key");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get room", () => {
    test("should return room data when getRoom receives a successful response", async () => {
      const client = new Liveblocks({ secret: "sk_xxx" });
      await expect(client.getRoom("123")).resolves.toEqual(room);
    });

    test("should throw a LiveblocksError when getRoom receives an error response", async () => {
      const error = {
        error: "ROOM_NOT_FOUND",
        message: "Room not found",
        suggestion:
          "Please use a valid room ID, room IDs are available in the dashboard: https://liveblocks.io/dashboard/rooms",
        docs: "https://liveblocks.io/docs/api-reference/rest-api-endpoints",
      };

      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId`, () => {
          return HttpResponse.json(error, { status: 404 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw an LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getRoom("123");
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Room not found");
          expect(String(err)).toBe(
            "LiveblocksError: Room not found (status 404)\nSuggestion: Please use a valid room ID, room IDs are available in the dashboard: https://liveblocks.io/dashboard/rooms\nSee also: https://liveblocks.io/docs/api-reference/rest-api-endpoints"
          );
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });

    test("should throw an error when getRoom fails due to network error", async () => {
      // Simulate a network error response.
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId`, () => {
          return HttpResponse.error();
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // Expect the function to throw an error due to the network issue. However, it should not be an HttpError.
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getRoom("123");
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(false);
      }
    });
  });

  describe("get active users", () => {
    test("should return active users when getActiveUsers receives a successful response", async () => {
      const client = new Liveblocks({ secret: "sk_xxx" });
      await expect(client.getActiveUsers("123")).resolves.toEqual({
        data: activeUsers,
      });
    });
  });

  describe("edit comment", () => {
    test("should return the edited comment when editComment receives a successful response", async () => {
      const commentData = {
        body: {
          version: 1 as const,
          content: [],
        },
        editedAt: new Date(),
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId`,
          async ({ request }) => {
            const data = await request.json();

            if (JSON.stringify(data) === JSON.stringify(commentData)) {
              return HttpResponse.json(comment);
            }

            return HttpResponse.error();
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });
      const res = await client.editComment({
        roomId: "room1",
        threadId: "thread1",
        commentId: "comment1",
        data: commentData,
      });
      expect(res).toEqual(comment);
    });

    test("should throw a LiveblocksError when editComment receives an error response", async () => {
      const error = {
        error: "RESOURCE_NOT_FOUND",
        message: "Comment not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.editComment({
          roomId: "room1",
          threadId: "thread1",
          commentId: "comment1",
          data: {
            body: {
              version: 1 as const,
              content: [],
            },
          },
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Comment not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("create thread", () => {
    test("should return the created thread when createThread receives a successful response", async () => {
      const threadData = {
        comment: {
          userId: "user1",
          createdAt: new Date(),
          body: {
            version: 1 as const,
            content: [],
          },
        },
        metadata: {
          color: "blue",
        },
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`,
          async ({ request }) => {
            const data = await request.json();

            if (JSON.stringify(threadData) === JSON.stringify(data)) {
              return HttpResponse.json(thread);
            }

            return HttpResponse.error();
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });
      const res = await client.createThread({
        roomId: "room1",
        data: threadData,
      });

      expect(res).toEqual(thread);
    });

    test("should throw a LiveblocksError when createThread receives an error response", async () => {
      const threadData = {
        comment: {
          userId: "user1",
          createdAt: new Date(),
          body: {
            version: 1 as const,
            content: [],
          },
        },
        metadata: {
          color: "blue",
        },
      };

      const error = {
        error: "RESOURCE_ALREADY_EXISTS",
        message: "Thread already exists",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`,
          async ({ request }) => {
            const data = await request.json();
            if (JSON.stringify(threadData) === JSON.stringify(data)) {
              return HttpResponse.json(error, { status: 409 });
            }

            return HttpResponse.error();
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to create a thread, which should fail and throw an error.
        await client.createThread({
          roomId: "room1",
          data: threadData,
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(409);
          expect(err.message).toBe("Thread already exists");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("delete thread", () => {
    test("should delete a thread when deleteThread receives a successful response", async () => {
      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId`,
          () => {
            return HttpResponse.text(null, { status: 204 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      const res = await client.deleteThread({
        roomId: "room1",
        threadId: "thread1",
      });

      expect(res).toBeUndefined();
    });

    test("should throw a LiveblocksError when deleteThread receives an error response", async () => {
      const error = {
        error: "THREAD_NOT_FOUND",
        message: "Thread not found",
      };

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.deleteThread({
          roomId: "room1",
          threadId: "thread1",
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Thread not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get threads", () => {
    test("should return a list of threads when getThreads receives a successful response", async () => {
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`, () => {
          return HttpResponse.json(
            {
              data: [thread],
            },
            { status: 200 }
          );
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getThreads({
          roomId: "room1",
        })
      ).resolves.toEqual({
        data: [thread],
      });
    });

    test("should return a filtered list of threads when a query parameter is used for getThreads", async () => {
      const query =
        "metadata['status']:'open' AND metadata['priority']:3 AND resolved:true";
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`, (res) => {
          const url = new URL(res.request.url);

          expect(url.searchParams.get("query")).toEqual(query);

          return HttpResponse.json(
            {
              data: [thread],
            },
            { status: 200 }
          );
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getThreads({
          roomId: "room1",
          query,
        })
      ).resolves.toEqual({
        data: [thread],
      });
    });

    test("should return a filtered list of threads when a query parameter is used for getThreads with a metadata object", async () => {
      const expectedQuery =
        "metadata['status']:'open' metadata['priority']:3 metadata['organization']^'liveblocks:'";

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`,
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("query")).toEqual(expectedQuery);
            return HttpResponse.json({ data: [thread] }, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getThreads({
          roomId: "room1",
          query: {
            metadata: {
              status: "open",
              priority: 3,
              organization: {
                startsWith: "liveblocks:",
              },
            },
          },
        })
      ).resolves.toEqual({
        data: [thread],
      });
    });
  });

  describe("get thread", () => {
    test("should return the specified thread when getThread receives a successful response", async () => {
      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId`,
          () => {
            return HttpResponse.json(thread, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getThread({
          roomId: "room1",
          threadId: "thread1",
        })
      ).resolves.toEqual(thread);
    });
  });

  describe("mark thread as resolved", () => {
    test("should return the specified thread when markThreadAsResolved receives a successful response", async () => {
      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/mark-as-resolved`,
          () => {
            return HttpResponse.json(
              { ...thread, resolved: true },
              { status: 200 }
            );
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.markThreadAsResolved({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        })
      ).resolves.toEqual({ ...thread, resolved: true });
    });

    test("should throw a LiveblocksError when markThreadAsResolved receives an error response", async () => {
      const error = {
        error: "THREAD_NOT_FOUND",
        message: "Thread not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/mark-as-resolved`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.markThreadAsResolved({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Thread not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("mark thread as unresolved", () => {
    test("should return the specified thread when markThreadAsUnresolved receives a successful response", async () => {
      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/mark-as-unresolved`,
          () => {
            return HttpResponse.json(
              { ...thread, resolved: false },
              { status: 200 }
            );
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.markThreadAsUnresolved({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        })
      ).resolves.toEqual({ ...thread, resolved: false });
    });

    test("should throw a LiveblocksError when markThreadAsUnresolved receives an error response", async () => {
      const error = {
        error: "THREAD_NOT_FOUND",
        message: "Thread not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/mark-as-unresolved`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.markThreadAsUnresolved({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Thread not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("subscribe to thread", () => {
    test("should return the created subscription when subscribeToThread receives a successful response", async () => {
      const now = new Date();

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/subscribe`,
          () => {
            return HttpResponse.json(
              {
                kind: "thread",
                subjectId: "thread1",
                createdAt: now.toISOString(),
                userId: "user-1",
              },
              { status: 200 }
            );
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.subscribeToThread({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        })
      ).resolves.toEqual({
        kind: "thread",
        subjectId: "thread1",
        createdAt: now,
        userId: "user-1",
      });
    });

    test("should throw a LiveblocksError when subscribeToThread receives an error response", async () => {
      const error = {
        error: "THREAD_NOT_FOUND",
        message: "Thread not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/subscribe`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.subscribeToThread({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Thread not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("unsubscribe from thread", () => {
    test("should not return anything when unsubscribeFromThread receives a successful response", async () => {
      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/unsubscribe`,
          () => {
            return HttpResponse.json(undefined, { status: 204 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.unsubscribeFromThread({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        })
      ).resolves.not.toThrow();
    });

    test("should throw a LiveblocksError when unsubscribeFromThread receives an error response", async () => {
      const error = {
        error: "THREAD_NOT_FOUND",
        message: "Thread not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/unsubscribe`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.unsubscribeFromThread({
          roomId: "room1",
          threadId: "thread1",
          data: { userId: "user-1" },
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Thread not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get thread subscriptions", () => {
    test("should return the thread subscription when subgetThreadSubscriptionsscribeToThread receives a successful response", async () => {
      const now = new Date();

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/subscriptions`,
          () => {
            return HttpResponse.json(
              {
                data: [
                  {
                    kind: "thread",
                    subjectId: "thread1",
                    createdAt: now.toISOString(),
                    userId: "user-1",
                  },
                  {
                    kind: "thread",
                    subjectId: "thread1",
                    createdAt: now.toISOString(),
                    userId: "user-2",
                  },
                  {
                    kind: "thread",
                    subjectId: "thread1",
                    createdAt: now.toISOString(),
                    userId: "user-3",
                  },
                ],
              },
              { status: 200 }
            );
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getThreadSubscriptions({
          roomId: "room1",
          threadId: "thread1",
        })
      ).resolves.toEqual({
        data: [
          {
            kind: "thread",
            subjectId: "thread1",
            createdAt: now,
            userId: "user-1",
          },
          {
            kind: "thread",
            subjectId: "thread1",
            createdAt: now,
            userId: "user-2",
          },
          {
            kind: "thread",
            subjectId: "thread1",
            createdAt: now,
            userId: "user-3",
          },
        ],
      });
    });

    test("should throw a LiveblocksError when getThreadSubscriptions receives an error response", async () => {
      const error = {
        error: "THREAD_NOT_FOUND",
        message: "Thread not found",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/subscriptions`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getThreadSubscriptions({
          roomId: "room1",
          threadId: "thread1",
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Thread not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get comment", () => {
    test("should return the specified comment when getComment receives a successful response", async () => {
      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId`,
          () => {
            return HttpResponse.json(comment, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getComment({
          roomId: "room1",
          threadId: "thread1",
          commentId: "comment1",
        })
      ).resolves.toEqual(comment);
    });
  });

  describe("add comment reaction", () => {
    test("should add a reaction to a comment when addReaction receives a successful response", async () => {
      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId/add-reaction`,
          () => {
            return HttpResponse.json(reaction, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.addCommentReaction({
          roomId: "room1",
          threadId: "thread1",
          commentId: "comment1",
          data: reaction,
        })
      ).resolves.toEqual(reaction);
    });
  });

  describe("send yjs update", () => {
    test("should successfully send a Yjs update", async () => {
      const update = new Uint8Array([21, 31]);
      server.use(
        http.put(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc`,
          async ({ request }) => {
            const buffer = await request.arrayBuffer();
            const data = new Uint8Array(buffer);

            // Return void if the data is the same as the update.
            if (data.length === update.length) {
              for (let i = 0; i < data.length; i++) {
                if (data[i] !== update[i]) {
                  return HttpResponse.error();
                }
              }
            }

            return HttpResponse.json(null);
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.sendYjsBinaryUpdate("roomId", update)
      ).resolves.not.toThrow();
    });

    test("should successfully send a Yjs update for a subdocument", async () => {
      const update = new Uint8Array([21, 31]);
      server.use(
        http.put(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc`, ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get("guid") === "subdoc") {
            return HttpResponse.json(null);
          }
          return HttpResponse.error();
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.sendYjsBinaryUpdate("roomId", update, {
          guid: "subdoc",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("return yjs update in binary format", () => {
    test("should successfully return the binary update for a Yjs document", async () => {
      const update = new Uint8Array([21, 31]);
      server.use(
        http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc-binary`, () => {
          return HttpResponse.arrayBuffer(update);
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getYjsDocumentAsBinaryUpdate("roomId")
      ).resolves.toEqual(update.buffer);
    });

    test("should successfully return the binary update for a Yjs subdocument", async () => {
      const update = new Uint8Array([21, 31]);
      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc-binary`,
          ({ request }) => {
            const url = new URL(request.url);
            if (url.searchParams.get("guid") === "subdoc") {
              return HttpResponse.arrayBuffer(update);
            }
            return HttpResponse.arrayBuffer(new Uint8Array([0]));
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getYjsDocumentAsBinaryUpdate("roomId", {
          guid: "subdoc",
        })
      ).resolves.toEqual(update.buffer);
    });
  });

  describe("get inbox notification", () => {
    test("should return the specified inbox notification when getInboxNotification receives a successful response", async () => {
      const userId = "user1";
      const inboxNotificationId = "notification1";

      const notification = {
        id: inboxNotificationId,
        kind: "thread",
        notifiedAt: new Date().toISOString(),
        readAt: null,
        threadId: "thread1",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => {
            return HttpResponse.json(notification, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getInboxNotification({
          userId,
          inboxNotificationId,
        })
      ).resolves.toEqual({
        ...notification,
        notifiedAt: new Date(notification.notifiedAt),
        readAt: notification.readAt ? new Date(notification.readAt) : null,
      });
    });

    test("should throw a LiveblocksError when getInboxNotification receives an error response", async () => {
      const userId = "user1";
      const inboxNotificationId = "notification1";

      const error = {
        error: "INBOX_NOTIFICATION_NOT_FOUND",
        message: "Inbox notification not found",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getInboxNotification({
          userId,
          inboxNotificationId,
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Inbox notification not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get inbox notifications", () => {
    test("should return the user's inbox notifications when getInboxNotifications receives a successful response", () => {
      const userId = "user1";

      const notifications = [
        {
          id: "notification1",
          kind: "thread",
          notifiedAt: new Date().toISOString(),
          readAt: null,
          threadId: "thread1",
        },
      ];

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications`,
          () => {
            return HttpResponse.json({ data: notifications }, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      return expect(client.getInboxNotifications({ userId })).resolves.toEqual({
        data: notifications.map((notification) => ({
          ...notification,
          notifiedAt: new Date(notification.notifiedAt),
          readAt: notification.readAt ? new Date(notification.readAt) : null,
        })),
      });
    });

    test("getInboxNotifications works with a query", async () => {
      const userId = "user1";
      const notifications = [
        {
          id: "notification1",
          kind: "thread",
          notifiedAt: new Date().toISOString(),
          readAt: null,
          threadId: "thread1",
        },
      ];

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications`,
          (res) => {
            const url = new URL(res.request.url);

            expect(url.searchParams.size).toEqual(1);
            expect(url.searchParams.get("query")).toEqual("unread:true");

            return HttpResponse.json({ data: notifications }, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getInboxNotifications({
          userId,
          query: {
            unread: true,
          },
        })
      ).resolves.toEqual({
        data: notifications.map((notification) => ({
          ...notification,
          notifiedAt: new Date(notification.notifiedAt),
          readAt: notification.readAt ? new Date(notification.readAt) : null,
        })),
      });

      // with a string query
      await expect(
        client.getInboxNotifications({
          userId,
          query: "unread:true",
        })
      ).resolves.toEqual({
        data: notifications.map((notification) => ({
          ...notification,
          notifiedAt: new Date(notification.notifiedAt),
          readAt: notification.readAt ? new Date(notification.readAt) : null,
        })),
      });
    });

    test("should throw a LiveblocksError when getInboxNotifications receives an error response", async () => {
      const userId = "user1";

      const error = {
        error: "USER_NOT_FOUND",
        message: "User not found",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getInboxNotifications({ userId });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("User not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get user room subscription settings", () => {
    test("should get user's room subscription settings", async () => {
      const userId = "user1";

      const settings = {
        threads: "all",
        textMentions: "mine",
        roomId: "room1",
      };

      const response = {
        data: [settings],
        meta: {
          nextCursor: null,
        },
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/room-subscription-settings`,
          () => {
            return HttpResponse.json(response, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getUserRoomSubscriptionSettings({ userId })
      ).resolves.toEqual(response);
    });

    test("should return the next page of user's room subscription settings when getUserRoomSubscriptionSettings receives a successful response", async () => {
      const userId = "user1";
      const startingAfter = "cursor1";
      const limit = 1;

      const settings = [
        {
          roomId: "room1",
          threads: "all",
          textMentions: "mine",
        },
      ];

      const response = {
        data: settings,
        meta: {
          nextCursor: "cursor2",
        },
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/room-subscription-settings`,
          (res) => {
            const url = new URL(res.request.url);
            expect(url.searchParams.size).toEqual(2);
            expect(url.searchParams.get("startingAfter")).toEqual(
              startingAfter
            );
            expect(url.searchParams.get("limit")).toEqual(limit.toString());

            return HttpResponse.json(response, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getUserRoomSubscriptionSettings({ userId, startingAfter, limit })
      ).resolves.toEqual(response);
    });
    test("should throw a LiveblocksError when getUserRoomSubscriptionSettings receives an error response", async () => {
      const userId = "user1";

      const error = {
        error: "USER_NOT_FOUND",
        message: "User not found",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/room-subscription-settings`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        await client.getUserRoomSubscriptionSettings({ userId });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("User not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("get room subscription settings", () => {
    test("should get user's room subscription settings", async () => {
      const userId = "user1";
      const roomId = "room1";

      const settings = {
        threads: "all",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/users/:userId/subscription-settings`,
          () => {
            return HttpResponse.json(settings, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.getRoomSubscriptionSettings({
          userId,
          roomId,
        })
      ).resolves.toEqual(settings);
    });

    test("should throw a LiveblocksError when getRoomSubscriptionSettings receives an error response", async () => {
      const userId = "user1";
      const roomId = "room1";

      const error = {
        error: "ROOM_NOT_FOUND",
        message: "Room not found",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/users/:userId/subscription-settings`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getRoomSubscriptionSettings({
          userId,
          roomId,
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Room not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("update room subscription settings", () => {
    test("should update user's room subcription settings", async () => {
      const userId = "user1";
      const roomId = "room1";
      const settings: Partial<RoomSubscriptionSettings> = {
        threads: "all",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/users/:userId/subscription-settings`,
          async ({ request }) => {
            const data = await request.json();

            if (JSON.stringify(data) === JSON.stringify(settings)) {
              return HttpResponse.json(settings, { status: 200 });
            }

            return HttpResponse.error();
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.updateRoomSubscriptionSettings({
          userId,
          roomId,
          data: settings,
        })
      ).resolves.toEqual(settings);
    });

    test("should throw a LiveblocksError when updateRoomSubscriptionSettings receives an error response", async () => {
      const userId = "user1";
      const roomId = "room1";
      const settings: Partial<RoomSubscriptionSettings> = {
        threads: "all",
      };

      const error = {
        error: "ROOM_NOT_FOUND",
        message: "Room not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/users/:userId/subscription-settings`,
          async ({ request }) => {
            const data = await request.json();

            if (JSON.stringify(data) === JSON.stringify(settings)) {
              return HttpResponse.json(error, { status: 404 });
            }

            return HttpResponse.error();
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.updateRoomSubscriptionSettings({
          userId,
          roomId,
          data: settings,
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Room not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("delete room subscription settings", () => {
    test("should delete user's room subscription settings", async () => {
      const userId = "user1";
      const roomId = "room1";

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/users/:userId/subscription-settings`,
          () => {
            return HttpResponse.json(undefined, { status: 204 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.deleteRoomSubscriptionSettings({
          userId,
          roomId,
        })
      ).resolves.toBeUndefined();
    });

    test("should throw a LiveblocksError when deleteRoomSubscriptionSettings receives an error response", async () => {
      const userId = "user1";
      const roomId = "room1";

      const error = {
        error: "ROOM_NOT_FOUND",
        message: "Room not found",
      };

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/users/:userId/subscription-settings`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.deleteRoomSubscriptionSettings({
          userId,
          roomId,
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Room not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("update room id", () => {
    test("should update a room's ID", async () => {
      server.use(
        http.post(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/update-room-id`, () => {
          return HttpResponse.json(room, { status: 200 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });
      const res = await client.updateRoomId({
        currentRoomId: "room1",
        newRoomId: "newRoom1",
      });

      expect(res).toEqual(room);
    });

    test("should throw a LiveblocksError when updateRoomId receives an error response", async () => {
      const error = {
        error: "ROOM_NOT_FOUND",
        message: "Room not found",
      };

      server.use(
        http.post(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/update-room-id`, () => {
          return HttpResponse.json(error, { status: 404 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.updateRoomId({
          currentRoomId: "room1",
          newRoomId: "newRoom1",
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Room not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("trigger inbox notification", () => {
    test("should return the created inbox notification when triggerInboxNotification receives a successful response", async () => {
      const userId = "user1";

      server.use(
        http.post(`${DEFAULT_BASE_URL}/v2/inbox-notifications/trigger`, () => {
          return HttpResponse.json({}, { status: 200 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.triggerInboxNotification({
          userId,
          kind: "$fileUploaded",
          subjectId: "subject1",
          activityData: { file: "url" },
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("delete user's inbox notification", () => {
    test("should delete user's inbox notification", async () => {
      const userId = "user1";
      const inboxNotificationId = "in_123";

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications/:inboxNotificationId`,
          () => {
            return HttpResponse.json(undefined, { status: 204 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.deleteInboxNotification({
          userId,
          inboxNotificationId,
        })
      ).resolves.toBeUndefined();
    });

    test("should throw a LiveblocksError when deleteInboxNotification receives an error response", async () => {
      const userId = "user1";
      const inboxNotificationId = "in_123";

      const error = {
        error: "RESOURCE_NOT_FOUND",
        message: "Inbox notification frobbed",
      };

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications/:inboxNotificationId`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.deleteInboxNotification({
          userId,
          inboxNotificationId,
        });
        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Inbox notification frobbed");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("delete all user's inbox notification", () => {
    test("should delete all user's inbox notifications", async () => {
      const userId = "user1";

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications`,
          () => {
            return HttpResponse.json(undefined, { status: 204 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.deleteAllInboxNotifications({
          userId,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("get user's notification settings", () => {
    test("should get user's notification settings", async () => {
      const userId = "florent";

      const settings: NotificationSettingsPlain = {
        email: {
          thread: true,
          textMention: false,
        },
        slack: {
          thread: true,
          textMention: false,
        },
        teams: {
          thread: true,
          textMention: false,
        },
        webPush: {
          thread: true,
          textMention: false,
        },
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(settings, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      const expected = createNotificationSettings(settings);
      await expect(client.getNotificationSettings({ userId })).resolves.toEqual(
        expected
      );
    });

    test("should throw a LiveblocksError when getNotificationSettings receives an error response", async () => {
      const userId = "dracula";
      const error = {
        error: "USER_NOT_FOUND",
        message: "User not found",
      };

      server.use(
        http.get(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.getNotificationSettings({ userId });

        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("User not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("update user's notification settings", () => {
    test("should update user's notification settings", async () => {
      const userId = "nimesh";
      const settings: NotificationSettingsPlain = {
        email: {
          textMention: false,
          thread: false,
        },
        slack: {
          thread: false,
          textMention: false,
        },
        teams: {
          thread: false,
          textMention: false,
        },
        webPush: {
          thread: false,
          textMention: false,
        },
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(settings, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });
      const expected = createNotificationSettings(settings);
      await expect(
        client.updateNotificationSettings({
          userId,
          data: {
            email: {
              textMention: false,
              thread: false,
            },
            slack: {
              thread: false,
              textMention: false,
            },
            teams: {
              thread: false,
              textMention: false,
            },
            webPush: {
              thread: false,
              textMention: false,
            },
          },
        })
      ).resolves.toEqual(expected);
    });

    test("should update user's notification settings partially", async () => {
      const userId = "adri";
      const settings: NotificationSettingsPlain = {
        email: {
          textMention: true,
          thread: true,
        },
        slack: {
          textMention: true,
          thread: true,
        },
        teams: {
          textMention: true,
          thread: true,
        },
        webPush: {
          thread: true,
          textMention: true,
        },
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(settings, { status: 200 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });
      const expected = createNotificationSettings(settings);
      await expect(
        client.updateNotificationSettings({
          userId,
          data: {
            email: { textMention: true },
          },
        })
      ).resolves.toEqual(expected);
    });

    test("should throw a LiveblocksError when updateNotificationSettings receives an error response", async () => {
      const userId = "mina";
      const error = {
        error: "USER_NOT_FOUND",
        message: "User not found",
      };

      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.updateNotificationSettings({
          userId,
          data: {
            email: {
              textMention: false,
              thread: false,
            },
            slack: {
              textMention: false,
              thread: false,
            },
            teams: {
              textMention: false,
              thread: false,
            },
            webPush: {
              thread: false,
              textMention: false,
            },
          },
        });

        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("User not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("delete user's notification settings", () => {
    test("should delete user's notification settings", async () => {
      const userId = "adri";

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(undefined, { status: 204 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      await expect(
        client.deleteNotificationSettings({ userId })
      ).resolves.toBeUndefined();
    });

    test("should throw a LiveblocksError when deleteNotificationSettings receives an error response", async () => {
      const userId = "jonathan";
      const error = {
        error: "USER_NOT_FOUND",
        message: "User not found",
      };

      server.use(
        http.delete(
          `${DEFAULT_BASE_URL}/v2/users/:userId/notification-settings`,
          () => {
            return HttpResponse.json(error, { status: 404 });
          }
        )
      );

      const client = new Liveblocks({ secret: "sk_xxx" });

      // This should throw a LiveblocksError
      try {
        // Attempt to get, which should fail and throw an error.
        await client.deleteNotificationSettings({
          userId,
        });

        // If it doesn't throw, fail the test.
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof LiveblocksError).toBe(true);
        if (err instanceof LiveblocksError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("User not found");
          expect(err.name).toBe("LiveblocksError");
        }
      }
    });
  });

  describe("mutating storage from the backend", () => {
    test("should read room's storage from the server and construct a Live tree", async () => {
      server.use(
        http.post(
          `${DEFAULT_BASE_URL}/v2/rooms/:roomId/request-storage-mutation`,
          () => {
            // prettier-ignore
            const nodes = [
              ["root", { type: 0, data: {} }],
              ["0:1", { type: 1, parentId: "root", parentKey: "a" }],
              ["0:2", { type: 2, parentId: "root", parentKey: "b" }],
              ["0:3", { type: 3, parentId: "0:1", parentKey: "!", data: { abc: 123 }}],
              ["0:4", { type: 3, parentId: "0:1", parentKey: "%", data: { xyz: 3.14 }}],
            ] satisfies IdTuple<SerializedCrdt>[];

            return HttpResponse.text(
              [{ actor: 123 }, ...nodes]
                .map((n) => JSON.stringify(n))
                .join("\n"),
              { headers: { "Content-Type": "application/x-ndjson" } }
            );
          }
        ),
        http.post(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/send-message`, () => {
          // Accept anything for this test
          return new HttpResponse(null, { status: 204 });
        })
      );

      const client = new Liveblocks({ secret: "sk_xxx" });
      await expect(
        client.mutateStorage("my-room", ({ root }) => {
          expect(root.toImmutable() as unknown).toEqual({
            a: [{ abc: 123 }, { xyz: 3.14 }],
            b: new Map(),
          });

          // Mutate it!
          root.set("z", new LiveList([1, 2, 3]));
        })
      ).resolves.toBeUndefined();
    });
  });
});
