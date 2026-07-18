export * from 'ant-design-vue';
import * as antd from 'ant-design-vue';

//region Input
import MyInput from './components/Input/index.vue';
export const Input = {
  ...MyInput,
  install(app) {
    antd.Input.install?.(app);
    app.component(antd.Input.name, MyInput);
  },
  Group: antd.Input.Group,
  Password: antd.Input.Password,
  Search: antd.Input.Search,
  TextArea: antd.Input.TextArea,
};
//endregion
//region Select
import MySelect from './components/Select/index.vue';
export const Select = {
  ...MySelect,
  install(app) {
    antd.Select.install?.(app);
    app.component(antd.Select.name, MySelect);
  },
  //Option: antd.Select.Option,
  //OptGroup: antd.Select.OptGroup,
};
//endregion
//region Checkbox
import MyCheckbox from './components/Checkbox/index.vue';
export const Checkbox = {
  ...MyCheckbox,
  install(app) {
    antd.Checkbox.install?.(app);
    app.component(antd.Checkbox.name, MyCheckbox);
  },
  Group: antd.Checkbox.Group,
};
//endregion
//region TimePicker
import MyTimePicker from './components/TimePicker/index.vue';
export const TimePicker = {
  ...MyTimePicker,
  install(app) {
    antd.TimePicker.install?.(app);
    app.component(antd.TimePicker.name, MyTimePicker);
  },
  //TimePicker: antd.TimePicker.TimePicker,
  //TimeRangePicker: antd.TimePicker.TimeRangePicker,
};
//endregion
//region RangePicker
import MyRangePicker from './components/RangePicker/index.vue';
export const RangePicker = {
	...MyRangePicker,
};
//endregion
//region DatePicker
import MyDatePicker from './components/DatePicker/index.vue';
export const DatePicker = {
  ...MyDatePicker,
  install(app) {
    antd.DatePicker.install?.(app);
    app.component(antd.DatePicker.name, MyDatePicker);
  },
  MonthPicker: antd.DatePicker.MonthPicker,
  RangePicker,
  WeekPicker: antd.DatePicker.WeekPicker,
  //QuarterPicker: antd.DatePicker.QuarterPicker,
};
//endregion
