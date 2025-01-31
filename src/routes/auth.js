const Router = require("@koa/router");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { Op } = require("sequelize");

const router = new Router({
  prefix: "/auth",
});

// 注册路由
router.post("/register", async (ctx) => {
  const { username, password } = ctx.request.body;

  // 检查用户是否已存在
  const existingUser = await User.findOne({
    where: { username },
  });

  if (existingUser) {
    ctx.status = 400;
    ctx.body = {
      failed: true,
      message: "该邮箱已被注册",
    };
    return;
  }

  // 加密密码
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 创建新用户
  try {
    const user = await User.create({
      username,
      password: hashedPassword,
    });

    // 生成JWT令牌
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    ctx.status = 200;
    ctx.body = {
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  } catch (error) {
    console.log(error);
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "注册失败，请稍后重试",
    };
  }
});

// 登录路由
router.post("/login", async (ctx) => {
  const { username, password } = ctx.request.body;

  // 查找用户
  const user = await User.findOne({
    where: { username },
  });

  if (!user) {
    ctx.status = 400;
    ctx.body = {
      failed: true,
      message: "用户名或密码错误",
    };
    return;
  }

  // 验证密码
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    ctx.status = 400;
    ctx.body = {
      failed: true,
      message: "用户名或密码错误",
    };
    return;
  }

  // 生成JWT令牌
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  ctx.body = {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  };
});

module.exports = router;
