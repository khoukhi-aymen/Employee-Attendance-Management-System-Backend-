import bcrypt from 'bcryptjs';
import { logAction ,isLoggedIn } from '../middleware/auth.js';
import pool from '../db.js';


// POST /api/auth/login

export const loginModel = (username, password, req) => {

    return new Promise((resolve, reject) => {

        if (!username || !password) {

            return reject({
                success: false,
                message: 'الرجاء إدخال اسم المستخدم وكلمة المرور'
            });

        }

        pool.execute(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username]
        )

        .then(([rows]) => {

            if (!rows.length) {

                logAction(
                    req,
                    'login_failed',
                    `محاولة دخول فاشلة - ${username}`
                );

                return reject({
                    success: false,
                    message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
                });

            }

            const user = rows[0];

            bcrypt.compare(password, user.password)

            .then((isMatch) => {

                if (!isMatch) {

                    logAction(
                        req,
                        'login_failed',
                        `محاولة دخول فاشلة - ${username}`
                    );

                    return reject({
                        success: false,
                        message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
                    });

                }

                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.fullName = user.full_name;
                req.session.employeeId = String(user.employee_id).trim();
                req.session.role = user.role;
                req.session.lastActivity = Date.now();

                //console.log("LOGIN");
                //console.log(user);
                //console.log(req.session);

                // LOG SUCCESS
                req.session.save((err) => {

                        if (err) {
                            return reject({
                            success: false,
                            message: "حدث خطأ أثناء حفظ بيانات الجلسة"
                        });
                }

                logAction(req, 'login_success', `تسجيل دخول ناجح - ${user.role}`);

                return resolve({
                            success: true,
                            message: 'تم تسجيل الدخول بنجاح',
                            data: {
                                role: user.role,
                                fullName: user.full_name,
                                employeeId: user.employee_id
                            }
                });

            });

            })

            .catch(() => {

                logAction(
                    req,
                    'login_failed',
                    `محاولة دخول فاشلة - ${username}`
                );

                reject({
                    success: false,
                    message: 'حدث خطأ أثناء معالجة الطلب'
                });

            });

        })

        .catch(() => {

            logAction(
                req,
                'login_failed',
                `محاولة دخول فاشلة - ${username}`
            );

            reject({
                success: false,
                message: 'خطأ في قاعدة البيانات'
            });

        });

    });

};



// POST /api/auth/logout

export const logoutModel = (req) => {

    return new Promise((resolve, reject) => {

        // SAUVEGARDE AVANT DESTROY
        const userId = req.session?.userId;
        const username = req.session?.username;

        req.session.destroy((err) => {

            if (err) {

                return reject({
                    success: false,
                    message: 'فشل تسجيل الخروج'
                });
            }

            logAction(req, 'logout', `تسجيل خروج - ${username}`);

            resolve({
                success: true,
                message: 'تم تسجيل الخروج بنجاح'
            });

        });

    });

};



// GET /api/auth/session (*****)

export const sessionModel = (req) => {

    return new Promise((resolve) => {

        if (isLoggedIn(req)) {

            resolve({
                success: true,
                message: 'الجلسة نشطة',
                data: {
                    role: req.session.role,
                    fullName: req.session.fullName,
                    employeeId: req.session.employeeId,
                }
            });

        } else {

            resolve({
                success: false,
                message: 'انتهت الجلسة'
            });
        }
    });
};


// POST /api/auth/update-password

export const updatePasswordModel = (req) => {

    return new Promise((resolve, reject) => {


        if (!req.session || !req.session.userId) {
            return reject({
                success: false,
                message: 'الرجاء تسجيل الدخول'
            });
        }

        const { newPassword } = req.body;

        if (!newPassword) {
            return reject({
                success: false,
                message: 'كلمة المرور الجديدة مطلوبة'
            });
        }

        bcrypt.hash(newPassword, 10)

            .then((hashed) => {

                return pool.execute(
                    'UPDATE users SET password = ? WHERE id = ?',
                    [hashed, req.session.userId]
                );
            })

            .then(() => {

                // LOG SUCCESS
                logAction(req, 'update_pwd_success', `تحديث كلمة المرور للمستخدم: ${req.session.username}`);

                resolve({
                    success: true,
                    message: 'تم التحديث بنجاح'
                });
            })

            .catch((err) => {

                // LOG FAILED
                logAction(req, 'update_pwd_failed',`   خطأ تحديث كلمة المرور للمستخدم ${req.session.username}`);

                reject({
                    success: false,
                    message: `خطأ تحديث كلمة المرور`
                });
            });
    });
};
