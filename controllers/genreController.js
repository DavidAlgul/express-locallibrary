const Genre = require("../models/genre");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");
const { body, validationResult} = require("express-validator");

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await Genre.find().sort({name: 1}).exec();

  res.render("genre_list", {
    title: "Genre List",
    genre_list: allGenres,
  });
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  // My Solution !

  // const genreID = req.params.id;

  // const genre = Genre.findById(genreID).exec();

  // const allBooksWithID = await Book
  //   .find({genre: genreID})
  //   .exec();

  // res.render("genre_detail", {
  //   title: "Genre Detail",
  //   genre: genre,
  //   genre_books: allBooksWithID
  // });


  // Get details of genre and all associated books (in parallel)
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),

    Book.find({genre: req.params.id}, "title summary").exec(),
  ]);

  if (genre === null) {
    // No results.
    const err = new Error(" Genre not found");
    err.status = 404;
    return next(err);
  }

  // Errors passed to the next middleware function propagate through to our error handling code (this was set up when we generated the app skeleton - for more information see Handling Errors).

  res.render("genre_detail", {
    title: "Genre Detail",
    genre: genre,
    genre_books: booksInGenre
  });
});

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", {title: "Create Genre"});
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // The first thing to note is that instead of being a single middleware function (with arguments (req, res, next)) the controller specifies an array of middleware functions. The array is passed to the router function and each method is called in order.

  // Validate and sanitize the name field.

  body("name", "Genre name must contain at least 3 characters").trim().isLength({min: 3}).escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
  // Extract the validation errors from a request.
  const errors = validationResult(req);

  // Create a Genre object with escaped and trimmed data (and old id!)
  const genre = new Genre({name: req.body.name})  

  if (!errors.isEmpty()) { // If the Error Array is not empty
    // There are errors. Render the form again with sanitized values/error messages.
    res.render("genre_form", {
      title: "Create Genre",
      genre: genre,
      errors: errors.array(),
    });
    return;
  } else {
    // Data from form is valid.
    // Check if Genre with same name already exists.
    const genreExists = await Genre.findOne({name: req.body.name}).collation({locale: "en", strength:2}).exec();

    // Die Collation steuert, wie Zeichen verglichen werden, insbesondere bei:

      // Groß-/Kleinschreibung
      // Akzentzeichen
      // Sprachspezifischen Sortierungen
      // ⚙️ Parameter-Bedeutung:

        // locale: "en" → Verwende englische Sprachregeln
        // strength: 2 → Ignoriere Groß-/Kleinschreibung, aber unterscheide z. B. "a" von "ä"
    
    if (genreExists) {
        // Genre exists, redirect to its detail page.
      res.redirect(genreExists.url);
    }
    else {
      await genre.save();
      // Genre saved. Redirect to genre detail page.
      res.redirect(genre.url);
    }
  }
  })
]

// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  const [genre, allBooksByGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({genre: req.params.id}, "title summary").exec(),
  ]);

  if (genre === null) {
    // No results
    res.redirect("/catalog/genres");
  }

  res.render("genre_delete", {
    title: "Delete Genre",
    genre,
    genre_books: allBooksByGenre,
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
  const [genre, allBooksByGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({genre: req.params.id}, "title summary").exec(), 
  ]);

  if(allBooksByGenre.length > 0) {
    // Genre has books. Render in same way as for GET route.
    res.render("genre_delete", {
      title: "Delete Genre",
      genre,
      genre_books: allBooksByGenre,
    });
    return;
  }

  // Genre has no books. Delete object and redirect to the list of genres.
  await Genre.findByIdAndDelete(req.body.genreid)
  res.redirect("/catalog/genres");
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  const genre = await Genre.findById(req.params.id).exec();

  if (genre === null) {
    // No results
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }

  res.render("genre_form", {
    title: "Update Genre",
    genre,
  });
});

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength( {min: 3})
    .escape(),

    // Extract the validation errors from a request.
    
asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);

  // Create a Genre object with escaped and trimmed data (and old id!)

  const genre = new Genre({
    name: req.body.name,
    _id: req.params.id // This is required, or a new ID will be assigned!
  });

  if (!errors.isEmpty()) {
    // There are errors. Render the form again with sanitized values/error messages.
    res.render("genre_form", {
      title: "Update Genre",
      genre,
      errors: errors.array(),
    });
    return;
  } else {
    // Data from form is valid. Update the record.
    const updatedGenre = await Genre.findByIdAndUpdate(req.params.id, genre, {});
    res.redirect(updatedGenre.url);
  }
}),
]

// Warum braucht man validationResult() zusätzlich, wenn body() doch schon .withMessage(...) hat?

// 🔧 body(...).withMessage(...)
// Diese Methode definiert die Regeln und legt fest, welche Fehlermeldung angezeigt werden soll, wenn die Regel fehlschlägt.

// 🧠 Aber: Sie allein zeigt die Fehlermeldung nicht an – sie speichert sie nur im Validierungs-"Zwischenspeicher" von Express Validator.
// 🧰 validationResult(req)
// Diese Methode holt alle gesammelten Fehler, die durch die Validierungsregeln wie body(...) entstanden sind.

// Du brauchst sie, um:

// zu prüfen, ob es überhaupt Fehler gibt (!errors.isEmpty())
// die Fehler in dein Template zu übergeben (z. B. in res.render(...))
