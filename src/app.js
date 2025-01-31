const Koa = require("koa");
const cors = require("@koa/cors");
const bodyParser = require("koa-bodyparser");
require("dotenv").config();
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const imageRouter = require("./routes/image");
const { initUnsplashSchedule } = require("./services/unsplashService");
const quicklinksRouter = require("./routes/quicklinks");

const app = new Koa();

// 连接数据库
connectDB();

// 中间件
app.use(cors());
app.use(bodyParser());

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      message: err.message || "服务器错误",
    };
  }
});

// 路由
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());
app.use(imageRouter.routes());
app.use(imageRouter.allowedMethods());
app.use(quicklinksRouter.routes());
app.use(quicklinksRouter.allowedMethods());

// 初始化定时任务
initUnsplashSchedule();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
