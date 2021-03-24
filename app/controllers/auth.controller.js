const config = require("../config/auth.config");
const db = require("../models");
const crypto = require("crypto");
const sendgridTransport = require('nodemailer-sendgrid-transport')
const nodemailer = require('nodemailer')
const User = db.user;
const Role = db.role;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const {user} = require("../models");
const {modelNames} = require("mongoose");


exports.signup = (req, res) => {
  const {email, password, place, name, degree, phone} = req.body;
  const index = email.indexOf("@");
  const login = email.substring(0, index);
  const user = new User({
    username: login,
    email: email,
    password: bcrypt.hashSync(password, 8),
    place: place,
    name: name,
    degree: degree,
    phone: phone,
  });
  
  console.log(user);
  
  user.save((err, user) => {
    if (err) {
      res.status(500).send({message: err});
      return;
    }
    
    if (req.body.roles) {
      Role.find(
        {
          name: {$in: req.body.roles}
        },
        (err, roles) => {
          if (err) {
            res.status(500).send({message: err});
            return;
          }
          
          user.roles = roles.map(role => role._id);
          user.save(err => {
            if (err) {
              res.status(500).send({message: err});
              return;
            }
            
            res.send({message: "Користувач зареєстрований успішно!"});
          });
        }
      );
    } else {
      Role.findOne({name: "user"}, (err, role) => {
        if (err) {
          res.status(500).send({message: err});
          return;
        }
        
        user.roles = [role._id];
        user.save(err => {
          if (err) {
            res.status(500).send({message: err});
            return;
          }
          
          res.send({message: "Користувач зареєстрований!"});
        });
      });
    }
  });
};

exports.signin = (req, res) => {
  User.findOne({
    username: req.body.username
  })
    .populate("roles", "-__v")
    .exec((err, user) => {
      if (err) {
        res.status(500).send({message: err});
        return;
      }
      
      if (!user) {
        return res.status(404).send({message: "Користувача не знайдено!."});
      }
      
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );
      
      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Невірний пароль!"
        });
      }
      
      var token = jwt.sign({id: user.id}, config.secret, {
        expiresIn: 86400 // 24 hours
      });
      
      var authorities = [];
      
      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
      }
      res.status(200).send({
        id: user._id,
        username: user.username,
        email: user.email,
        roles: authorities,
        accessToken: token,
        phone: user.phone,
        degree: user.degree,
        place: user.place,
        name: user.name
      });
    });
};

exports.resetpassword = (req, res) => {
  debugger;
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err)
    }
    const token = buffer.toString("hex")
    User.findOne({email: req.body.email})
      .then(user => {
        if (!user) {
          res.send("Такого користувача не існує!");
          return;
        }
        user.resetToken = token
        user.expireToken = Date.now() + 3600000
        user.save().then((result) => {
          transporter.sendMail({
            to: user.email,
            from: "mydev1488@gmail.com",
            subject: "Поновлення пароля для сайту конференії",
            html: `
              <p>Для поновлення пароля на сайті конференції перейдіть за посиланням та створіть новий пароль</p>
              <h5>Посилання для поновлення пароля: <a href="http://localhost:8082/reset/${token}">Натисніть тут</a></h5>
              `
          })
          res.send("Перевірте свою поштову скриню!");
        })
      })
  })
}

exports.newpassword = (req, res) => {
  const newPassword = req.body.password
  const sentToken = req.body.token
  User.findOne({resetToken: sentToken, expireToken: {$gt: Date.now()}})
    .then(user => {
      bcrypt.hash(newPassword, 12).then(hashedpassword => {
        user.password = hashedpassword
        user.resetToken = undefined
        user.expireToken = undefined
        user.save().then(() => {
          res.send("Новий пароль встановлено, повторіть вхід до особистого кобінету!");
        })
      })
    }).catch(err => {
    console.log(err)
  })
}

exports.updateuser = (req, res) => {
  const {email, password, place, name, degree, phone, username} = req.body;
  const index = email.indexOf("@");
  const login = email.substring(0, index);
  User.findOne({username: username})
    .then(user => {
        if (password) {
          bcrypt.hash(password, 12).then((hashedpassword) => {
            user.email =  email;
            user.username = login;
            user.password = hashedpassword;
            user.place = place;
            user.name = name;
            user.degree = degree;
            user.phone = phone;
            console.log(user);
            user.save().then(() => {
              res.json({message: "Дані користувача поновлено!"})
            })
          })
        } else {
          user.email =  email;
          user.username = login;
          user.place = place;
          user.name = name;
          user.degree = degree;
          user.phone = phone;
          console.log(user);
          user.save().then(() => {
            res.json({message: "Дані користувача поновлено!"})
          })
        }
      }
    ).catch(err => {
    console.log(err)
  })
}
