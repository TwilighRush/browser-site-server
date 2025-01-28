const Router = require("@koa/router");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = new Router({
  prefix: "/api/auth",
});

// 注册路由
router.post("/register", async (ctx) => {
  const { username, email, password } = ctx.request.body;

  // 检查用户是否已存在
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    ctx.status = 400;
    ctx.body = { message: "用户名或邮箱已存在" };
    return;
  }

  // 加密密码
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 创建新用户
  const user = new User({
    username,
    email,
    password: hashedPassword,
  });

  await user.save();
  ctx.status = 201;
  ctx.body = { message: "注册成功" };
});

// 登录路由
router.post("/login", async (ctx) => {
  const { username, password } = ctx.request.body;

  // 查找用户
  const user = await User.findOne({ username });
  if (!user) {
    ctx.status = 400;
    ctx.body = { message: "用户名或密码错误" };
    return;
  }

  // 验证密码
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    ctx.status = 400;
    ctx.body = { message: "用户名或密码错误" };
    return;
  }

  // 生成JWT令牌
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  ctx.body = {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  };
});

module.exports = router;
