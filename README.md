xakep2vk
========
Скрипт для репостинга статей и новостей с сайта xakep.ru в группу Вконтакте

Зависимости
-----------
* vkontakte
* cheerio
* fibers
* form-data
* html-entities
* iconv
* mongodb

Настройка
---------
1. Скопируйте файл config.js.sample в config.js
2. Отредактируйте параметры в config.js, указав id группы, token приложения и параметры для подключения к MongoDB

Token может быть прописан в config.js автоматически с помошью скрипта auth.js. Предварительно необходимо заменить
в нем YOUR_VK_EMAIL и YOUR_VK_PASS на ваши логин и пароль от vk.com.

Команда запуска скрипта auth.js:
```
node auth.js
```

Запуск
------
```
node spider.js
```

Лицензия
--------
MIT
