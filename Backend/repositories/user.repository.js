const { User } = require("../models");

const isMissingOtpColumnError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("reset_otp") || message.includes("resetotpexpires");
};

const createUser = async (payload) => {
  return User.create(payload);
};

const findByEmail = async (email) => {
  try {
    return await User.findOne({ where: { email } });
  } catch (error) {
    if (!isMissingOtpColumnError(error)) {
      throw error;
    }

    // Fallback for legacy schema where reset OTP columns are not present yet.
    return User.findOne({
      where: { email },
      attributes: ["id", "username", "email", "password", "role", "status"],
    });
  }
};

const setResetOtp = async (userId, otp, expiresAt) => {
  return User.update(
    {
      resetOtp: otp,
      resetOtpExpires: expiresAt,
    },
    { where: { id: userId } },
  );
};

const updatePasswordAndClearOtp = async (userId, hashedPassword) => {
  return User.update(
    {
      password: hashedPassword,
      resetOtp: null,
      resetOtpExpires: null,
    },
    { where: { id: userId } },
  );
};

const updatePasswordOnly = async (userId, hashedPassword) => {
  return User.update(
    {
      password: hashedPassword,
    },
    { where: { id: userId } },
  );
};

module.exports = {
  createUser,
  findByEmail,
  setResetOtp,
  updatePasswordAndClearOtp,
  updatePasswordOnly,
};
