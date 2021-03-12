const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dbConfig = require("./app/config/db.config");
const http = require('http');
const socketio = require('socket.io');
const {addUser, removeUser, getUser, getUsersInRoom} = require('./users');
const router = require('./router');
const app = express();

var corsOptions = {
  origin: "http://localhost:8081"
};

const server = http.createServer(app);
const io = socketio(server);

io.on('connect', (socket) => {
  socket.on('join', ({name, room}, callback) => {
    const {error, user} = addUser({id: socket.id, name, room});
    
    if (error) return callback(error);
    
    socket.join(user.room);
    
    socket.emit('message', {user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
    socket.broadcast.to(user.room).emit('message', {user: 'admin', text: `${user.name} has joined!`});
    
    io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});
    
    callback();
  });
  
  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    
    io.to(user.room).emit('message', {user: user.name, text: message});
    
    callback();
  });
  
  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    
    if (user) {
      io.to(user.room).emit('message', {user: 'Admin', text: `${user.name} has left.`});
      io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

app.use(cors(corsOptions));
app.use(router);

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

const db = require("./app/models");
const Role = db.role;

db.mongoose
  .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
    initial();
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });

// simple route
app.get("/", (req, res) => {
  res.json({message: "app"});
});

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/application.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: "user"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }
        
        console.log("added 'user' to roles collection");
      });
      
      new Role({
        name: "moderator"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }
        
        console.log("added 'moderator' to roles collection");
      });
      
      new Role({
        name: "admin"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }
        
        console.log("added 'admin' to roles collection");
      });
    }
  });
}
