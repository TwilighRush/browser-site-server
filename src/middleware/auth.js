const jwt = require("jsonwebtoken");

module.exports = async (ctx, next) => {
  try {
    const token = ctx.headers.authorization?.split(" ")[1];

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: "未提供认证令牌" };
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ctx.state.user = decoded;
      await next();
    } catch (error) {
      ctx.status = 401;
      ctx.body = { message: "无效的认证令牌" };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { message: "服务器错误" };
  }
};
