# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Build APK Without EAS Cloud Queue

This repository includes GitHub Actions workflows that build Android APK using local EAS mode on GitHub runners.

1. Add `EXPO_TOKEN` in GitHub repository secrets.
2. Open Actions tab and run `Build Android APK (No EAS Queue)`.
3. Download artifacts from the workflow run:
   - `cbk-android-apk-debug` (faster test build)
   - `cbk-android-apk-release` (release APK)

Workflow file:

- `.github/workflows/build-apk-local.yml`

## Auto Attach APK To GitHub Release

The repository also includes a release pipeline that builds release APK and attaches it to GitHub Releases.

1. Ensure `EXPO_TOKEN` secret is set.
2. Create and push a tag like `v1.0.0`.
3. Workflow builds `apk-release` profile and publishes the APK in the release assets.

Workflow file:

- `.github/workflows/release-apk.yml`

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
