const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

app.use(express.json());
app.use(cors());

const http = require("http");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
const server = http.createServer(app);
const botName = "ChatCord Bot";

// Pass the server instance to Socket.io and configure CORS for Socket.io
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000", // Specify the allowed origin
    methods: ["GET", "POST"], // Specify the allowed HTTP methods
  },
});

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send("Hello World");
});

io.on("connection", (socket) => {
  console.log("Connection done");

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);
    //welcome current users
    socket.emit("message", formatMessage(botName, "Welcome to Chat Cord"));

    //Broadcast when user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `A ${user.username} has joined the chat`)
      );

    //send users and room info
    io.to(user.room).emit("room_users", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  //listen client messages
  socket.on("send_message", (data) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit(
      "receive_message",
      formatMessage(user.username, data)
    );
  });

  //client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `A ${user.username} has left the chat`)
      );
      //send users and room info
      io.to(user.room).emit("room_users", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
