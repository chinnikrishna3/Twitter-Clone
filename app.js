const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertUser = (dbObject) => {
  return {
    user_id: dbObject.user_id,
    name: dbObject.name,
    username: dbObject.username,
    password: dbObject.password,
    gender: dbObject.gender,
  };
};

const convertFollower = (dbObject) => {
  return {
    follower_id: dbObject.follower_id,
    follower_user_id: dbObject.follower_user_id,
    following_user_id: dbObject.following_user_id,
  };
};
const convertTweet = (dbObject) => {
  return {
    tweet_id: dbObject.tweet_id,
    tweet: dbObject.tweet,
    user_id: dbObject.user_id,
    date_time: dbObject.date_time,
  };
};
const convertReply = (dbObject) => {
  return {
    reply_id: dbObject.reply_id,
    tweet_id: dbObject.tweet_id,
    reply: dbObject.reply,
    user_id: dbObject.user_id,
    date_time: dbObject.date_time,
  };
};
const convertLike = (dbObject) => {
  return {
    like_id: dbObject.like_id,
    tweet_id: dbObject.tweet_id,
    user_id: dbObject.user_id,
    date_time: dbObject.date_time,
  };
};

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

const validatePassword = (password) => {
  return password.length > 5;
};

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (user_id, name, username, hashedPassword, gender)
     VALUES
      (
       '${user_id}',
       '${name}',
       '${username}'
       '${hashedPassword},
       '${gender}', 
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});


app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const getUserQuery = `
    SELECT
      username, tweet, dateTime
    FROM
      (user inner join follower where user.user_id = follower.follower_user_id)
      inner join tweet where tweet.user_id = follower.following_user_id
      group by user_id
      limit 4;`
      ;
  const userArray = await database.all(getUserQuery);
  response.send(convertTweet(userArray)
    
    )
  );
});


app.get("/user/following/", authenticateToken, async (request, response) => {
  const getUserQuery = `
    select name from user inner join follower where user.user_id = following.follower_id
    group by name` 
      ;
  const userArray = await database.all(getUserQuery);
  
  response.send(convertFollower(userArray)
    
    )
  );
});


app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
    const {tweet_id} = request.params;
  const getUserQuery = `
    select tweet, count(like) as likes, count(reply) as replies, date_time as dateTime from tweet
    where
    tweet_id = {tweet_id};`
      ;
  const userArray = await database.all(getUserQuery);
  if (userArray === undefined){
      response.status(401);
      response.send("Invalid Request");
  }else{
  response.send(convertFollower(userArray)}
    
    )
  );
});
app.get("/tweets/:tweetId/likes/", authenticateToken, async (request, response) => {
    const {tweet_id} = request.params;
  const getUserQuery = `
    select name as likes from tweet inner join like where tweet.user_id = like.following_user_id
    group by name;`
      ;
  const userArray = await database.all(getUserQuery);
  if (userArray === undefined){
      response.status(401);
      response.send("Invalid Request");
  }else{
  response.send(convertLike(userArray)}
    
    )
  );
});


app.get("/tweets/:tweetId/replies/", authenticateToken, async (request, response) => {
    const {tweet_id} = request.params;
  const getUserQuery = `
    select {name, reply} as replies as likes from (tweet inner join reply where tweet.user_id = follower.following_user_id)
    inner join user where follower.follower.user_id = user.user_id
    group by name;`
      ;
  const userArray = await database.all(getUserQuery);
  if (userArray === undefined){
      response.status(401);
      response.send("Invalid Request");
  }else{
  response.send(convertReply(userArray)}
    
    )
  );
});



app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const getUserQuery = `
    select tweet, count(like) as likes, count(reply) as replies, date_time as dateTime from user 
    inner join tweet where user.user_id = tweet.user_id
    group by name` 
      ;
  const userArray = await database.all(getUserQuery);
  
  response.send(convertUser(userArray)
    
    )
  );
});


app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const {tweet_id, tweet, user_id, date_time } = request.body;
  const postUserQuery = `
  INSERT INTO
    tweet (tweet_id, tweet, user_id, date_time)
  VALUES
    (${tweet_id}, '${tweet}', ${user_id}, ${}, ${date_time});`;
  await database.run(postUserQuery);
  response.send("Created a Tweet");
});



app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweet_id } = request.params;
    const deleteUserQuery = `
  DELETE FROM
   tweet
  WHERE
    tweet_id = ${tweet_id} 
  `;
    await database.run(deleteUserQuery);
    response.send("Tweet Removed");
  }
);


module.exports = app;