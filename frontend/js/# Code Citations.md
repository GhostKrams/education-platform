# Code Citations

## License: MIT
https://github.com/PsychedelicMonkey/React-Gallery/tree/e56f01e430932219e24c6d439afc5ccddfdd7f70/routes/api/auth.js

```
('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400)
```

