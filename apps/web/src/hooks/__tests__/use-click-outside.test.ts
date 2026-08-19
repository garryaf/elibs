import { renderHook } from "@testing-library/react";
import { useClickOutside } from "../use-click-outside";

describe("useClickOutside hook", () => {
  it("calls handler when clicking outside of the referenced element", () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useClickOutside<HTMLDivElement>(handler, true));

    const element = document.createElement("div");
    document.body.appendChild(element);
    (result.current as React.MutableRefObject<HTMLDivElement | null>).current = element;

    const outsideElement = document.createElement("button");
    document.body.appendChild(outsideElement);

    // Click inside
    const clickInside = new MouseEvent("mousedown", { bubbles: true });
    element.dispatchEvent(clickInside);
    expect(handler).not.toHaveBeenCalled();

    // Click outside
    const clickOutside = new MouseEvent("mousedown", { bubbles: true });
    outsideElement.dispatchEvent(clickOutside);
    expect(handler).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });

  it("calls handler on touchstart outside of the referenced element", () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useClickOutside<HTMLDivElement>(handler, true));

    const element = document.createElement("div");
    document.body.appendChild(element);
    (result.current as React.MutableRefObject<HTMLDivElement | null>).current = element;

    const outsideElement = document.createElement("div");
    document.body.appendChild(outsideElement);

    // Touch outside
    const touchOutside = new TouchEvent("touchstart", { bubbles: true });
    outsideElement.dispatchEvent(touchOutside);
    expect(handler).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });

  it("calls handler when Escape key is pressed", () => {
    const handler = jest.fn();
    renderHook(() => useClickOutside<HTMLDivElement>(handler, true));

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(escapeEvent);
    expect(handler).toHaveBeenCalledTimes(1);

    const otherKey = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    document.dispatchEvent(otherKey);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when active is false", () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useClickOutside<HTMLDivElement>(handler, false));

    const element = document.createElement("div");
    document.body.appendChild(element);
    (result.current as React.MutableRefObject<HTMLDivElement | null>).current = element;

    const outsideElement = document.createElement("button");
    document.body.appendChild(outsideElement);

    const clickOutside = new MouseEvent("mousedown", { bubbles: true });
    outsideElement.dispatchEvent(clickOutside);
    expect(handler).not.toHaveBeenCalled();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(escapeEvent);
    expect(handler).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });
});
