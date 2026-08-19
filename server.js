const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const cloudinary = require("cloudinary").v2;
// ========================================
// CLOUDINARY
// ========================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const app = express();
const PORT = process.env.PORT || 3000;


// ========================================
// ADMIN LOGIN DETAILS
// ========================================

const ADMIN_USERNAME = "ROHAN";
const ADMIN_PASSWORD = "701427";


// ========================================
// BASIC MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ========================================
// SESSION
// ========================================

app.use(
    session({
        secret: "moviehub-rohan-secret-2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);


// ========================================
// MOVIE FILE
// ========================================

const moviesFile =
    path.join(__dirname, "movies.json");

if (!fs.existsSync(moviesFile)) {

    fs.writeFileSync(
        moviesFile,
        "[]"
    );

}


// ========================================
// UPLOAD FOLDERS
// ========================================

const postersFolder =
    path.join(__dirname, "posters");

const videosFolder =
    path.join(__dirname, "videos");


if (!fs.existsSync(postersFolder)) {
    fs.mkdirSync(postersFolder);
}

if (!fs.existsSync(videosFolder)) {
    fs.mkdirSync(videosFolder);
}


// ========================================
// STATIC POSTERS / VIDEOS
// ========================================

app.use(
    "/posters",
    express.static(postersFolder)
);

app.use(
    "/videos",
    express.static(videosFolder)
);


// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

function requireAdmin(req, res, next) {

    if (
        req.session &&
        req.session.isAdmin === true
    ) {

        return next();

    }


    return res.status(401).json({

        success: false,

        message: "Admin login required."

    });

}


// ========================================
// PROTECT ADMIN HTML
// ========================================

app.get(
    "/admin.html",
    (req, res) => {

        if (
            !req.session ||
            req.session.isAdmin !== true
        ) {

            return res.redirect(
                "/login.html"
            );

        }


        res.sendFile(
            path.join(
                __dirname,
                "admin.html"
            )
        );

    }
);

app.use(express.static(__dirname));
// ========================================
// MULTER
// ========================================

const storage =
    multer.diskStorage({

        destination: function(
            req,
            file,
            cb
        ) {

            if (
                file.fieldname === "poster"
            ) {

                cb(
                    null,
                    postersFolder
                );

            }

            else if (
                file.fieldname === "video"
            ) {

                cb(
                    null,
                    videosFolder
                );

            }

            else {

                cb(
                    new Error(
                        "Invalid file field"
                    )
                );

            }

        },


        filename: function(
            req,
            file,
            cb
        ) {

            const extension =
                path.extname(
                    file.originalname
                );


            const filename =
                Date.now() +
                "-" +
                Math.round(
                    Math.random() * 100000
                ) +
                extension;


            cb(
                null,
                filename
            );

        }

    });


const upload =
    multer({
        storage: storage
    });


// ========================================
// ADMIN LOGIN
// ========================================

app.post(
    "/api/admin/login",
    (req, res) => {

        const username =
            req.body.username;

        const password =
            req.body.password;


        if (
            username === ADMIN_USERNAME &&
            password === ADMIN_PASSWORD
        ) {

            req.session.isAdmin = true;

            return res.json({

                success: true,

                message:
                    "Login successful."

            });

        }


        return res.status(401).json({

            success: false,

            message:
                "Wrong username or password."

        });

    }
);


// ========================================
// LOGOUT
// ========================================

app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {

        req.session.destroy(
            (error) => {

                if (error) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Logout failed."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Logout successful."

                });

            }
        );

    }
);


// ========================================
// CHECK LOGIN STATUS
// ========================================

app.get(
    "/api/admin/status",
    (req, res) => {

        res.json({

            loggedIn:
                !!(
                    req.session &&
                    req.session.isAdmin === true
                )

        });

    }
);


// ========================================
// GET MOVIES
// PUBLIC
// ========================================

app.get(
    "/api/movies",
    (req, res) => {

        try {

            const movies =
                JSON.parse(
                    fs.readFileSync(
                        moviesFile,
                        "utf8"
                    )
                );


            res.json(movies);

        }

        catch (error) {

            console.error(
                "GET MOVIES ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Movies load nahi ho rahi."

            });

        }

    }
);


// ========================================
// ADD MOVIE
// ADMIN ONLY
// ========================================

// ========================================
// ADD MOVIE
// ADMIN ONLY
// CLOUDINARY UPLOAD
// ========================================

app.post(
    "/api/movies",

    requireAdmin,

    upload.fields([
        {
            name: "poster",
            maxCount: 1
        },
        {
            name: "video",
            maxCount: 1
        }
    ]),

    async (req, res) => {

        try {

            const movies =
                JSON.parse(
                    fs.readFileSync(
                        moviesFile,
                        "utf8"
                    )
                );


            // CHECK POSTER

            if (
                !req.files ||
                !req.files.poster ||
                !req.files.poster[0]
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Poster image required."

                });

            }


            // CHECK VIDEO

            if (
                !req.files.video ||
                !req.files.video[0]
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Movie video required."

                });

            }


            const posterFile =
                req.files.poster[0];

            const videoFile =
                req.files.video[0];


            // ========================================
            // UPLOAD POSTER TO CLOUDINARY
            // ========================================

            const posterResult =
                await cloudinary.uploader.upload(
                    posterFile.path,
                    {
                        folder: "moviehub/posters",
                        resource_type: "image"
                    }
                );


            // ========================================
            // UPLOAD VIDEO TO CLOUDINARY
            // ========================================

            const videoResult =
                await cloudinary.uploader.upload_large(
                    videoFile.path,
                    {
                        folder: "moviehub/videos",
                        resource_type: "video",
                        chunk_size: 6000000
                    }
                );


            // ========================================
            // CREATE MOVIE
            // ========================================

            const movie = {

                id:
                    Date.now().toString(),

                name:
                    req.body.name || "",

                category:
                    req.body.category || "",

                year:
                    req.body.year || "",

                description:
                    req.body.description || "",

                poster:
                    posterResult.secure_url,

                video:
                    videoResult.secure_url

            };


            // ADD MOVIE

            movies.push(movie);


            // SAVE JSON

            fs.writeFileSync(

                moviesFile,

                JSON.stringify(
                    movies,
                    null,
                    2
                )

            );


            // DELETE TEMPORARY LOCAL FILES

            try {

                if (
                    fs.existsSync(
                        posterFile.path
                    )
                ) {

                    fs.unlinkSync(
                        posterFile.path
                    );

                }

                if (
                    fs.existsSync(
                        videoFile.path
                    )
                ) {

                    fs.unlinkSync(
                        videoFile.path
                    );

                }

            }

            catch (cleanupError) {

                console.log(
                    "Temporary file cleanup warning:",
                    cleanupError.message
                );

            }


            console.log(
                "Movie added to Cloudinary:",
                movie.name
            );


            res.json({

                success: true,

                message:
                    "Movie successfully uploaded!",

                movie:
                    movie

            });

        }

        catch (error) {

            console.error(
                "CLOUDINARY UPLOAD ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Movie upload failed."

            });

        }

    }
);

// ========================================
// EDIT MOVIE
// ADMIN ONLY
// ========================================

app.put(
    "/api/movies/:id",

    requireAdmin,

    upload.fields([

        {
            name: "poster",
            maxCount: 1
        },

        {
            name: "video",
            maxCount: 1
        }

    ]),

    (req, res) => {

        try {

            const movieId =
                String(req.params.id);


            const movies =
                JSON.parse(
                    fs.readFileSync(
                        moviesFile,
                        "utf8"
                    )
                );


            const movieIndex =
                movies.findIndex(
                    movie =>
                        String(movie.id) ===
                        movieId
                );


            if (
                movieIndex === -1
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Movie nahi mili."

                });

            }


            const movie =
                movies[movieIndex];


            // TEXT DATA

            if (req.body.name) {

                movie.name =
                    req.body.name;

            }


            if (req.body.category) {

                movie.category =
                    req.body.category;

            }


            if (req.body.year) {

                movie.year =
                    req.body.year;

            }


            if (req.body.description) {

                movie.description =
                    req.body.description;

            }


            // NEW POSTER

            if (
                req.files &&
                req.files.poster &&
                req.files.poster[0]
            ) {

                const newPoster =
                    req.files.poster[0];


                if (movie.poster) {

                    const oldPoster =
                        path.join(
                            __dirname,
                            movie.poster.replace(
                                /^\//,
                                ""
                            )
                        );


                    if (
                        fs.existsSync(
                            oldPoster
                        )
                    ) {

                        fs.unlinkSync(
                            oldPoster
                        );

                    }

                }


                movie.poster =
                    "/posters/" +
                    newPoster.filename;

            }


            // NEW VIDEO

            if (
                req.files &&
                req.files.video &&
                req.files.video[0]
            ) {

                const newVideo =
                    req.files.video[0];


                if (movie.video) {

                    const oldVideo =
                        path.join(
                            __dirname,
                            movie.video.replace(
                                /^\//,
                                ""
                            )
                        );


                    if (
                        fs.existsSync(
                            oldVideo
                        )
                    ) {

                        fs.unlinkSync(
                            oldVideo
                        );

                    }

                }


                movie.video =
                    "/videos/" +
                    newVideo.filename;

            }


            movies[movieIndex] =
                movie;


            fs.writeFileSync(

                moviesFile,

                JSON.stringify(
                    movies,
                    null,
                    2
                )

            );


            console.log(
                "Movie updated:",
                movie.name
            );


            res.json({

                success: true,

                message:
                    "Movie successfully updated!",

                movie:
                    movie

            });

        }

        catch (error) {

            console.error(
                "EDIT MOVIE ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Movie update failed."

            });

        }

    }
);


// ========================================
// DELETE MOVIE
// ADMIN ONLY
// ========================================

app.delete(
    "/api/movies/:id",

    requireAdmin,

    (req, res) => {

        try {

            const movieId =
                String(req.params.id);


            const movies =
                JSON.parse(
                    fs.readFileSync(
                        moviesFile,
                        "utf8"
                    )
                );


            const movie =
                movies.find(
                    m =>
                        String(m.id) ===
                        movieId
                );


            if (!movie) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Movie nahi mili."

                });

            }


            // DELETE POSTER

            if (movie.poster) {

                const posterPath =
                    path.join(
                        __dirname,
                        movie.poster.replace(
                            /^\//,
                            ""
                        )
                    );


                if (
                    fs.existsSync(
                        posterPath
                    )
                ) {

                    fs.unlinkSync(
                        posterPath
                    );

                }

            }


            // DELETE VIDEO

            if (movie.video) {

                const videoPath =
                    path.join(
                        __dirname,
                        movie.video.replace(
                            /^\//,
                            ""
                        )
                    );


                if (
                    fs.existsSync(
                        videoPath
                    )
                ) {

                    fs.unlinkSync(
                        videoPath
                    );

                }

            }


            // REMOVE FROM JSON

            const updatedMovies =
                movies.filter(
                    m =>
                        String(m.id) !==
                        movieId
                );


            fs.writeFileSync(

                moviesFile,

                JSON.stringify(
                    updatedMovies,
                    null,
                    2
                )

            );


            console.log(
                "Movie deleted:",
                movie.name
            );


            res.json({

                success: true,

                message:
                    "Movie successfully deleted."

            });

        }

        catch (error) {

            console.error(
                "DELETE MOVIE ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Movie delete nahi hui."

            });

        }

    }
);


// ========================================
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `MovieHub running on port ${PORT}`
    );

});