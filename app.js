const express = require("express");
const dotenv = require("dotenv");

const dbConnect = require("./dbConnect/dbConnect");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");

const app = express();
dotenv.config();

app.use(express.json());

const runDatabase = async () => {
  await dbConnect.init();
};
runDatabase();

app.use(process.env.api, authRouter);
app.use(process.env.api, userRouter);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ success: false, message: message });
});

const server = app.listen(process.env.PORT, "localhost", () => {
  console.log(`listening on port ${process.env.PORT}`);
});
