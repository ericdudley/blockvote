import React, { SFC, Component, ChangeEvent } from "react";
import cx from "classnames";
import Store, { StoreProps, ELECTORAL_SYSTEM } from "./store";
import { inject, observer } from "mobx-react";
import {
  Select,
  Input,
  MenuItem,
  Dialog,
  Typography,
  Paper
} from "@material-ui/core";
import ReactJson from "react-json-view";

export interface StatusProps {
  status: boolean;
}
export const Status: SFC<StatusProps> = ({ status }) => (
  <div className="status-wrapper">
    <div
      className={cx("status", {
        "status--online": status,
        "status--offline": !status
      })}
    />
  </div>
);

export interface NodeSelectorProps {
  value: number;
  onChange: (val: number) => void;
  className: string;
  textClassName: string;
}

@inject("store")
@observer
export class NodeSelector extends Component<NodeSelectorProps & StoreProps> {
  onResultsNodeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onChange } = this.props;
    onChange(parseInt(event.target.value));
  };

  render() {
    const { value, className, textClassName } = this.props;
    const { online_nodes } = this.props.store as Store;
    return (
      <Select
        className={className}
        classes={{
          select: textClassName
        }}
        value={value}
        onChange={this.onResultsNodeChange}
        input={<Input name="results-node" id="results-node" />}
      >
        {online_nodes.map(n => (
          <MenuItem key={n.port} value={n.port}>
            {n.is_miner ? "Miner" : "Node"} {n.port}
          </MenuItem>
        ))}
      </Select>
    );
  }
}

export interface JsonProps {
  obj: any;
  name?: string;
}
export const Json: SFC<JsonProps> = ({ obj, name }) => (
  <ReactJson
    src={obj}
    name={name}
    collapseStringsAfterLength={16}
    collapsed={2}
  />
);

export interface ElectionSelectorProps {
  value: string;
  elections: any[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  className: string;
  textClassName: string;
}
export const ElectionSelector: SFC<ElectionSelectorProps> = ({
  elections,
  value,
  onChange,
  className,
  textClassName
}) => (
  <Select
    className={className}
    classes={{
      select: textClassName
    }}
    value={value}
    onChange={onChange}
    input={<Input name="election-select" id="election-select" />}
  >
    {elections.map(e => (
      <MenuItem key={e.id} value={e.id}>
        {e.label}
      </MenuItem>
    ))}
  </Select>
);

export interface ElectoralSystemSelectorProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  textClassName?: string;
}
export const ElectoralSystemSelector: SFC<ElectoralSystemSelectorProps> = ({
  value,
  onChange,
  className,
  textClassName
}) => (
  <Select
    className={className}
    classes={{
      select: textClassName
    }}
    value={value}
    onChange={onChange}
    input={
      <Input name="electoral-system-select" id="electoral-system-select" />
    }
  >
    {Object.values(ELECTORAL_SYSTEM).map(key => (
      <MenuItem key={key} value={key}>
        {key}
      </MenuItem>
    ))}
  </Select>
);

export interface ErrorBarProps {
  message?: string;
}
export const ErrorBar: SFC<ErrorBarProps> = ({ message }) => {
  return (
    <Paper>
      <Typography color="error">An error has occurred.</Typography>
      <Typography variant="caption">{message}</Typography>
    </Paper>
  );
};
