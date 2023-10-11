const http = require('http');
const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const serve = require('koa-static');
const Router = require('koa-router');
const cors = require('koa2-cors');
const uuid = require('uuid');

const app = new Koa();
const router = new Router();

const services = require('./services');
const publicDirPath = path.join(__dirname, '/public');

app.use(
  cors({
    origin: '*',
  }),
);

app.use(
  koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true,
  }),
);

router
  .get('/api/services', async (ctx, next) => {
    return await responseWithDelay(async () => {
      const { fortune } = ctx.query;
      console.log(fortune);
      const servicesWithoutContent = services.map(
        ({ content, ...service }) => service,
      );
      if (fortune !== undefined) {
        return fortuneFn(ctx, servicesWithoutContent);
      }
      ctx.body = servicesWithoutContent;
      return await next();
    }, 1000);
  })

  .post('/api/services', async (ctx, next) => {
    return await responseWithDelay(async () => {
      console.log(ctx.request.body);
      const { name, price, content } = JSON.parse(ctx.request.body);

      if (
        typeof name === 'string' &&
        typeof content === 'string' &&
        typeof price === 'number' &&
        price >= 10
      ) {
        const id = uuid.v4();
        const newService = { id, name, price, content };
        services.push(newService);
        ctx.body = newService;
      } else {
        ctx.status = 400;
        ctx.body = { message: 'Invalid data' };
      }
      return await next();
    }, 1000);
  })

  .get('/api/services/:id', async (ctx, next) => {
    return await responseWithDelay(async () => {
      const { fortune } = ctx.query;
      const { id } = ctx.params;
      const service = services.find((service) => service.id == id);

      if (service) {
        if (fortune !== undefined) {
          return fortuneFn(ctx, service);
        }
        ctx.body = service;
      } else {
        ctx.status = 400;
        ctx.body = { message: 'No services with such id' };
      }
      return await next();
    }, 1);
  })

  .put('/api/services/:id', async (ctx, next) => {
    return await responseWithDelay(async () => {
      const { id } = ctx.params;
      const serviceIndex = services.findIndex((service) => service.id == id);

      if (serviceIndex === -1) {
        ctx.status = 400;
        ctx.body = { message: 'No services with such id' };
        return await next();
      }

      const { name, price, content } = JSON.parse(ctx.request.body);

      if (
        typeof name === 'string' &&
        typeof content === 'string' &&
        typeof price === 'number' &&
        price >= 10
      ) {
        services[serviceIndex] = { id, name, price, content };
        ctx.body = services[serviceIndex];
      } else {
        ctx.status = 400;
        ctx.body = { message: 'Invalid data' };
      }
      return await next();
    }, 1000);
  })

  .delete('/api/services/:id', async (ctx, next) => {
    return await responseWithDelay(async () => {
      const { id } = ctx.params;
      const serviceIndex = services.findIndex((service) => service.id == id);

      if (serviceIndex !== -1) {
        services.splice(serviceIndex, 1);
        ctx.status = 204;
      } else {
        ctx.status = 400;
        ctx.body = { message: 'No services with such id' };
      }
      return await next();
    }, 100);
  })

  .get('/api/search', async (ctx, next) => {
    // поиск примитивный, но большего не надо
    return await responseWithDelay(async () => {
      const { q: query } = ctx.query;

      const servicesWithoutContent = services.map(
        ({ content, ...service }) => service,
      );
      const filteredServices = servicesWithoutContent.filter((service) => {
        const serviceName = service.name.toLowerCase();
        const queryString = query.toLowerCase();
        return serviceName.includes(queryString);
      });

      ctx.body = filteredServices;
      return await next();
    }, 10);
  });

async function responseWithDelay(callback, delay) {
  await new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
  return await callback();
}

function fortuneFn(ctx, body = null, status = 200) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.25) {
        ctx.response.status = status;
        ctx.response.body = body;
        resolve();
        return;
      }

      reject(new Error('Something bad happened'));
    }, 1 * 1000);
  });
}

app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve(publicDirPath));

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
server.listen(port);
