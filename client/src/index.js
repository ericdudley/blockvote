import React from "react";
import ReactDOM from "react-dom";
import "./index.scss";
import App from "./App";
import "./icons.scss";
import { Provider } from "mobx-react";
import Store from "./store";

const store = new Store();

const render = Component =>
  ReactDOM.render(
    <Provider store={store}>
      <Component />
    </Provider>,
    document.getElementById("root")
  );

render(App);

if (module.hot) {
  module.hot.accept("./App", () => {
    const NextApp = require("./App").default;
    render(NextApp);
  });
}
