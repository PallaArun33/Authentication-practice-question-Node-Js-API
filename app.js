const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/users/", async (request, response) => {
  const getUsersQuery = `
  SELECT
    *
  FROM
    user
  ORDER BY
    username;`;
  const usersArray = await db.all(getUsersQuery);
  response.send(usersArray);
});

// Register API

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
       SELECT *
       FROM user
       WHERE 
        username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);

  if (dbUser === undefined && password.length >= 5) {
    //Create new user
    console.log(password.length);
    const createNewUserQuery = `
        INSERT INTO
          user (username, name, password, gender, location)
        VALUES
         (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'  
         );`;

    await db.run(createNewUserQuery);
    response.send("User created successfully");
  } else if (dbUser === undefined && password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    console.log(password.length);
    response.send("User already exists");
  }
});

//Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `
       SELECT *
       FROM user
       WHERE 
       username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    // Invalid User
    response.status(400);
    response.send("Invalid user");
  } else {
    //Check Password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change Password

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const checkForUserQuery = `
       SELECT *
       FROM user
       WHERE 
       username = '${username}';`;

  const dbUser = await db.get(checkForUserQuery);
  //First we have to know that whether the user was exist in the database or not

  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    //Check Password
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword >= 5) {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                        UPDATE 
                        user
                        SET 
                        password = '${encryptedPassword}'
                        WHERE 
                        username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
