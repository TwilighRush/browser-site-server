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
    const token = ctx.headers.authorization?.split(" ")[1];

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "No token provided",
      };
      return;
    }

    let userId;
    try {
      // 尝试解析 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      // 如果 token 过期，尝试从 token 中提取 userId
      try {
        const decoded = jwt.decode(token);
        userId = decoded.userId;
      } catch (error) {
        ctx.status = 401;
        ctx.body = {
          failed: true,
          message: "Invalid token format",
        };
        return;
      }
    }

    // 使用 userId 查找用户
    const user = await User.findByPk(userId);
    if (!user || !user.refreshToken) {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "Invalid token or refresh token",
      };
      return;
    }

    let needNewRefreshToken = false;
    // 验证数据库中存储的 refresh token
    try {
      jwt.verify(user.refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      // refreshToken 过期了，需要生成新的
      needNewRefreshToken = true;
    }

    // 生成新的 access token
    const newToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "10s",
    });

    // 如果 refresh token 过期了，生成新的并保存到数据库
    if (needNewRefreshToken) {
      const newRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        {
          expiresIn: "7d",
        }
      );
      await user.update({ refreshToken: newRefreshToken });
    }

    ctx.body = {
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  } catch (error) {
    console.error("Refresh token error:", error);
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "Token refresh failed",
    };
  }
});

// 添加登出路由
router.post("/logout", async (ctx) => {
  try {
    // 从 authorization header 获取 token
    const token = ctx.headers.authorization?.split(" ")[1];

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "No token provided",
      };
      return;
    }

    try {
      // 解析 token 获取用户 ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 查找并清除用户的 refreshToken
      const user = await User.findByPk(decoded.userId);
      if (user) {
        await user.update({ refreshToken: null });
      }

      ctx.body = {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      ctx.status = 401;
      ctx.body = {
        failed: true,
        message: "Invalid token",
      };
    }
  } catch (error) {
    console.error("Logout error:", error);
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "Logout failed",
    };
  }
});

module.exports = router;
