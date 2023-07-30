# Installation

Switch to node v18.16.0 (using .nvmrc) :
```bash
nvm use
```

Install and build :
```bash
npm ci
npm run build
```

Then, move the built `dist/index.js` file into a new directory of your `extensions/interfaces`, for example `extensions/interfaces/uuid-file-image/index.js`.

That's it!

If you use docker, don't forget to mount the `interfaces` volume pointing to the directory containing `uuid-file-image/index.js`:
```yaml
    volumes:
      - ./path/to/local/interfaces:/directus/extensions/interfaces/
```

# Example of usage in a JSON repeater field

![Capture d’écran 2021-11-23 à 09 57 53](https://user-images.githubusercontent.com/17531455/142995390-b8484d50-d461-4e2a-a8a2-4ba7d7067c5d.png)


# To do (next version)

When the file's selected, I currently set in uuid field the `filename_disk` key of the file. 

I wanted this to be set by the user into interface options (`props.file_key_to_get`: `String`), but I didn't added it yet in `src/index.ts`.
