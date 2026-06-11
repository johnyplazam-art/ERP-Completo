export function getSelectValue(event) {
  const option = event.target.options[event.target.selectedIndex]
  return option ? option._value : null
}
