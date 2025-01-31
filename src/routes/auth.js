const Router = require("@koa/router");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { Op } = require("sequelize");

const router = new Router({
  prefix: "/auth",
});

// 生成 token 的辅助函数
async function generateTokens(user) {
  // 生成访问令牌
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  // 生成刷新令牌
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );

  // 将 refreshToken 保存到数据库
  await user.update({ refreshToken });

  return { token, refreshToken };
}

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
      expiresIn: "2h",
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

  // 生成新的 token 和 refresh token
  const { token, refreshToken } = await generateTokens(user);
  // 将 token 和 refreshToken 保存到数据库
  await user.update({ refreshToken });
  ctx.body = {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  };
});

// 修改刷新 token 的路由
router.post("/refresh", async (ctx) => {
  try {
    const { refreshToken } = ctx.request.body;

    if (!refreshToken) {
      ctx.status = 400;
      ctx.body = {
        failed: true,
        message: "Refresh token is required",
      };
      return;
    }

    // 验证 refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 查找用户并验证 refreshToken
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        refreshToken: refreshToken,
      },
    });

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "Invalid refresh token",
      };
      return;
    }

    // 生成新的 token 和 refresh token
    const tokens = await generateTokens(user);

    ctx.body = {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "Refresh token has expired",
      };
    } else {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "Invalid refresh token",
      };
    }
  }
});

// 添加登出路由
router.post("/logout", async (ctx) => {
  try {
    const { refreshToken } = ctx.request.body;

    if (refreshToken) {
      // 查找并清除用户的 refreshToken
      const user = await User.findOne({ where: { refreshToken } });
      if (user) {
        await user.update({ refreshToken: null });
      }
    }

    ctx.body = {
      message: "Logged out successfully",
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "Logout failed",
    };
  }
});

module.exports = router;
