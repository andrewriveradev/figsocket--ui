import service from "shared/service.js";

const send = (el, event) => el.addEventListener("click", async (e) => {
    e.preventDefault();
    await event;

    if(event.self) {
        if(el === e.target) {
            delete event.self;
            service.send(event);
        }
    } else {
        service.send(event);
    }
});

export {
    send,
};
