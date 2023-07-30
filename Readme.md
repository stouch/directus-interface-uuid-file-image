# Installation

```
npm i
npm run build
```

And then move the built `dist/index.js` file into a new directory of your `extensions/interfaces`, for example `extensions/interfaces/uuid-file-image/index.js`.



# Example of usage in a JSON repeater field

![Capture d’écran 2021-11-23 à 09 57 53](https://user-images.githubusercontent.com/17531455/142995390-b8484d50-d461-4e2a-a8a2-4ba7d7067c5d.png)


# To do (next version)

When the file's selected, I currently set in uuid field the `filename_disk` key of the file. 

I wanted this to be set by the user into interface options (`props.file_key_to_get`: `String`), but I didn't added it yet in `src/index.ts`.
