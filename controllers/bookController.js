const Book = require("../models/book");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const Author = require("../models/author");
const { body, validationResult } = require("express-validator"); 

const asyncHandler = require("express-async-handler");
const { ReverseSubtractEquation } = require("three");

exports.index = asyncHandler(async (req, res, next) => {
  // Get details of books, book instances, authors and genre counts (in parallel)
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres
  ] = await Promise.all([
    Book.countDocuments({}).exec(),
    BookInstance.countDocuments({}).exec(),
    BookInstance.countDocuments({status: "Available"}).exec(),
    Author.countDocuments({}).exec(),
    Genre.countDocuments({}).exec()
  ]);

  res.render("index", {
    title: "Local Library Home",
    book_count: numBooks,
    book_instance_count: numBookInstances,
    book_instance_available_count: numAvailableBookInstances,
    author_count: numAuthors,
    genre_count: numGenres,
  });
});

// Display list of all books.
exports.book_list = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, "title author")
    .sort({title: 1})
    .populate("author")
    .exec();

    res.render("book_list", {title: "Book List", book_list: allBooks});
});

// The route handler calls the find() function on the Book model, selecting to return only the title and author as we don't need the other fields (it will also return the _id and virtual fields), and sorting the results by the title alphabetically using the sort() method. We also call populate() on Book, specifying the author field—this will replace the stored book author id with the full author details. exec() is then daisy-chained on the end in order to execute the query and return a promise.

// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),

    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    // No results
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  res.render("book_detail", {
    title: book.title,
    book: book,
    book_instances: bookInstances,
  });
});

// Display book create form on GET.
exports.book_create_get = asyncHandler(async (req, res, next) => {
    // Get all authors and genres, which we can use for adding to our book.
    const [allAuthors, allGenres] = await Promise.all([
      Author.find().sort({ family_name: 1 }).exec(),
      Genre.find().sort({ name: 1 }).exec(),
    ]);

    res.render("book_form", {
      title: "Create Book",
      authors: allAuthors,
      genres: allGenres,
    });
});

// sowohl die Get-Methode, als auch die Post-Methode nutzen das selbe Formular, aber die Set-Methode erzeugt zusätzlich noch einen book-Objekt und error-Objekt und gibt es dem Template mit, während Get das nicht tut

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Was passiert hier?

  // Im Formular kann der Benutzer mehrere Genres auswählen (Checkboxen).
  // Wenn mehrere Genres ausgewählt werden, kommt req.body.genre als Array an.
  // Wenn nur eines ausgewählt wird, kommt es als String.
  // Wenn keines ausgewählt wird, kommt undefined.
  // 🔧 Diese Middleware sorgt also dafür:

  // // Ergebnis danach ist IMMER ein Array
  // // Beispiele:
  // "Fantasy"            → ["Fantasy"]
  // ["Fantasy", "Horror"] → bleibt ["Fantasy", "Horror"]
  // undefined            → []

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty")
    .trim()
    .isLength( { min: 1 })
    .escape(),
  body("genre.*")
    .escape(),

  // body() ist eine Funktion aus dem express-validator-Modul. Sie wird verwendet, um Eingabefelder aus einem HTTP-Request (z.B. aus einem Formular) zu validieren und zu bereinigen.
  // body("title") greift auf req.body.title zu – also den Wert, der im POST-Request gesendet wurde.

asyncHandler(async (req, res, next) => {
   // Extract the validation errors from a request.
   const errors = validationResult(req);
  //  Das ist die zentrale Funktion, um alle gesammelten Validierungsfehler aus dem Request zu holen.
  //  Sie durchsucht alle Validierungen, die mit body(), check() oder param() definiert wurden.
  //  Gibt ein Ergebnisobjekt zurück, das Informationen über die Fehler enthält.

   // Create a Book object with escaped and trimmed data.
   const book = new Book({
    title: req.body.title,
    author: req.body.author,
    summary: req.body.summary,
    isbn: req.body.isbn,
    genre: req.body.genre,
   });

   if(!errors.isEmpty()) {
    // There are errors. Render form again with sanitized values/error messages.

    // Get all authors and genres for form.
    const [allAuthors, allGenres] = await Promise.all([
      Author.find().sort({ family_name: 1 }).exec(),
      Genre.find().sort({ name: 1 }).exec(),
    ]);

    // Mark our selected genres as checked.
    for (const genre of allGenres) {
      if (book.genre.includes(genre._id)) {
        genre.checked = "true";
      }
    }
    res.render("book_form", {
      title: "Create Book",
      authors: allAuthors,
      genres: allGenres,
      book: book,
      errors: errors.array(),
    });
   } else {
    // Data from form is valid. Save book.
    await book.save();
    res.redirect(book.url);
   }

  //    if (!errors.isEmpty())

  // → Prüft, ob es irgendwelche Validierungsfehler gibt.

  // 2. Autoren und Genres neu laden

  // → Da das Formular bei Fehlern neu gerendert wird, müssen auch alle Auswahlfelder (z. B. Author, Genre) erneut aus der Datenbank geladen werden.

  // 3. Geklickte Genres als "checked" markieren

  // → Damit der Benutzer nicht nochmal alles anklicken muss:

  // if (book.genre.includes(genre._id)) {
  //   genre.checked = "true";
  // }
  // → Wenn das Genre vorher ausgewählt wurde, bekommt es im Template das Attribut checked, damit es wieder angekreuzt ist.

  // 4. Formular erneut anzeigen mit Fehlern

  // → Das Template book_form wird mit den:

  // Eingaben (book)
  // Autoren & Genres
  // Fehlern (errors.array())
  // erneut angezeigt.

  //   Aber warum liest er nur Author und Genre bei einem Fehler erneut aus und nicht auch den gesamten book Objekt?
  // ChatGPT:
  // Sehr gute Frage! Die kurze Antwort lautet:

  // 👉 Weil das book-Objekt aus dem Formular bereits im Speicher existiert – es wird vorher im Code selbst erstellt, mit genau den Werten, die der Benutzer eingegeben hat. Es muss also nicht aus der Datenbank gelesen werden.

  //   Warum brauchen wir Author und Genre trotzdem?
  // Weil author und genre Auswahlfelder (Dropdowns oder Checkboxen) im Formular sind – und um diese wieder korrekt anzuzeigen, müssen die verfügbaren Optionen aus der Datenbank geladen werden.

  // Beispiel:

  // author → Dropdown mit allen Autoren
  // genre → Checkbox-Liste mit allen Genres
  // Diese Daten kommen nicht vom Benutzer, sondern aus der Datenbank, also:

  // const [allAuthors, allGenres] = await Promise.all([
  //   Author.find().sort({ family_name: 1 }).exec(),
  //   Genre.find().sort({ name: 1 }).exec(),
  // ]);

  //   Das book-Objekt wird dann verwendet, um:

  // die bereits eingetragenen Werte wieder im Formular anzuzeigen (damit der Benutzer nicht alles neu eintippen muss)
  // das richtige Genre mit checked = true zu markieren
}),
];

// Display book delete form on GET.
exports.book_delete_get = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({ book: req.params.id}).exec(),
  ]);

  if (book === null) {
    // No results
    res.redirect("/catalog/books");
  }

  res.render("book_delete", {
    title: "Delete Book",
    book,
    book_instances: bookInstances,
  });
});

// Handle book delete on POST.
exports.book_delete_post = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if( bookInstances.length > 0) {
    // Book has book instances. Render in same way as for GET route.
    res.render("book_delete", {
      title: "Delete Book",
      book,
      book_instances: bookInstances,
    });
    return;
  }
  // Book has no book instances. Delete object and redirect to the list of books.

  await Book.findByIdAndDelete(req.body.bookid);
  res.redirect("/catalog/books");
});

// Display book update form on GET.
exports.book_update_get = asyncHandler(async (req, res, next) => {
  // Get book, authors and genres for form.
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).populate("author").exec(),
    Author.find().sort({ family_name: 1 }).exec(),
    Genre.find().sort({name: 1}).exec(),
  ]);

  if (book === null) {
    // No results
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  // Mark our selected genres as checked.
  allGenres.forEach((genre) => {
    if (book.genre.includes(genre._id))
      genre.checked = "true";
  });

  res.render("book_form", {
    title: "Update Book",
    authors: allAuthors,
    genres: allGenres,
    book,
  });

    //   Antwort:
    // Das liegt an einer Kurzschreibweise in JavaScript (ES6).

        // book
    // ist gleichbedeutend mit:

        // book: book
    // Das funktioniert, wenn der Schlüssel (Key) und die Variable (Value) denselben Namen haben.  
});

// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) =>{
    if(!Array.isArray(req.body.genre)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1})
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1})
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1})
    .escape(),
  body("isbn", "ISBN must not be empty.")
    .trim()
    .isLength({ min: 1})
    .escape(),
  body("genre.*")
    .escape(),
  
//   Was passiert genau?

// Wenn du ein HTML-Formular hast, in dem du mehrere Genres auswählen kannst (z. B. als Checkboxen), dann sendet das Formular mehrere Werte mit demselben Namen:

  // <input type="checkbox" name="genre" value="Fantasy" checked>
  // <input type="checkbox" name="genre" value="Science Fiction" checked>

  // Dann landet im Request:
  // req.body.genre = ["Fantasy", "Science Fiction"]

  // Mit:
  // body("genre.*").escape()
  // wird jedes einzelne Element dieses Arrays verarbeitet – also:

  // req.body.genre[0] = escape(req.body.genre[0])
  // req.body.genre[1] = escape(req.body.genre[1])


  // Process request after validation and sanitization.
asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({ family_name: 1}).exec(),
        Genre.find().sort({ name: 1 }).exec(),
      ]);

      // Mark our selected genres as checked.
      for (const genre of allGenres){
        if(book.genre.indexOf(genre._id) > -1) {
          genre.checked = "true";
        }
      }
      // Diese Zeile wird in der Schleife verwendet, um herauszufinden, welche Genres der Nutzer beim Bearbeiten des Buchs ausgewählt hat:

        // for (const genre of allGenres) {
        //   if (book.genre.indexOf(genre._id) > -1) {
        //     genre.checked = "true";
        //   }
        // }
      // 🧠 Bedeutung:
        // book.genre ist ein Array von IDs (z. B. ["664f...", "664e..."]) → das sind die vom Nutzer ausgewählten Genres.
        // genre._id ist die ID des aktuell durchlaufenen Genre-Objekts (aus der Datenbank).
        // indexOf(...) sucht, ob genre._id im book.genre-Array vorhanden ist.
        // > -1 heißt: Gefunden.
      // ✅ Zweck:
      // Wenn der aktuelle genre._id im book.genre-Array vorkommt, dann wurde dieses Genre vom Nutzer ausgewählt → also wird das Genre im Formular vorausgewählt (Checkbox: checked).

      // Wie funktioniert indexOf()?

        // array.indexOf(element)

      // Durchsucht das Array nach dem ersten Vorkommen von element.
      // Gibt den Index (also die Position) zurück, wenn es gefunden wird.
      // Gibt -1 zurück, wenn das Element nicht gefunden wird.

      // Warum > -1?

      // Weil:
        // Jede gefundene Position ist 0 oder größer
        // Nur wenn es nicht gefunden wird, kommt -1 zurück

      res.render("book_form", {
        title: "Update Book",
        authors: allAuthors,
        genres: allGenres,
        book,
        errors: errors.array(),
      });
      return;
    }
    // Data from form is valid. Update the record.
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});
    // Redirect to book detail page.
    res.redirect(updatedBook.url);
  }),

// 2. const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});

// 📌 Bedeutung:
// Hier wird das bestehende Buch in der Datenbank aktualisiert:

    // Book.findByIdAndUpdate(req.params.id, book, {});

// 💡 Erklärung der Parameter:
// Book.findByIdAndUpdate(id, updateObj, options)

    // req.params.id: Die ID des Buchs, das aktualisiert werden soll (kommt aus der URL, z. B. /book/12345/update)
    // book: Das neue Datenobjekt, das die alten Werte ersetzt (enthält title, author, summary, genre, etc.)
    // {}: Optionen – hier leer gelassen (man könnte z. B. { new: true } angeben, um das aktualisierte Dokument zurückzubekommen)

]






// Klar! Hier ist ein kompletter Ablauf, wie eine _id (z. B. für ein Buch) in einer Express/Mongoose-Anwendung entsteht, verwendet und in req.params.id landet:

// ✅ 1. Ein neues Buch wird erstellt

// Stell dir vor, du hast ein Buchformular. Du gibst den Titel, Autor usw. ein und klickst auf "Submit".

// 📤 POST-Anfrage an /catalog/book/create:
// // In deinem Controller
// const book = new Book({
//   title: req.body.title,
//   author: req.body.author,
//   summary: req.body.summary,
//   isbn: req.body.isbn,
//   genre: req.body.genre,
// });

// await book.save(); // 🟢 MongoDB erstellt jetzt automatisch eine _id!
// console.log(book._id); // z. B. "665066f5c7a4e23a3c4763ff"

// res.redirect(book.url); // z. B. → /catalog/book/665066f5c7a4e23a3c4763ff
// ✅ 2. Nach dem Speichern wird automatisch weitergeleitet

// Du leitest den Nutzer weiter auf die Detailansicht des Buches:

// res.redirect(book.url); // /catalog/book/:id
// Das funktioniert, weil du in deinem Mongoose-Modell einen virtuellen Getter hast:

// // In models/book.js
// bookSchema.virtual('url').get(function () {
//   return '/catalog/book/' + this._id;
// });
// ✅ 3. Route mit :id fängt die Anfrage ab

// In deiner Express-Routen-Datei:

// router.get('/catalog/book/:id', bookController.book_detail);
// Diese Route fängt z. B. /catalog/book/665066f5c7a4e23a3c4763ff ab und übergibt den Teil hinter /book/ als req.params.id.

// ✅ 4. Die ID wird im Controller verwendet

// exports.book_detail = asyncHandler(async (req, res, next) => {
//   const book = await Book.findById(req.params.id)
//                          .populate('author')
//                          .populate('genre')
//                          .exec();

//   if (!book) {
//     const err = new Error("Book not found");
//     err.status = 404;
//     return next(err);
//   }

//   res.render('book_detail', { title: book.title, book: book });
// });
// 📌 req.params.id ist hier also "665066f5c7a4e23a3c4763ff", die vom Link bzw. book.url kam – also ursprünglich von MongoDB erzeugt wurde.
