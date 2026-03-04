const Modal = {
  show(options) {
    const { title, content, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          <button class="btn modal-cancel">${cancelText}</button>
          <button class="btn btn-primary modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    const closeModal = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.modal-close').onclick = () => {
      closeModal();
      onCancel?.();
    };

    overlay.querySelector('.modal-cancel').onclick = () => {
      closeModal();
      onCancel?.();
    };

    overlay.querySelector('.modal-confirm').onclick = () => {
      const result = onConfirm?.(overlay);
      if (result !== false) closeModal();
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
        onCancel?.();
      }
    });

    const firstInput = overlay.querySelector('input');
    if (firstInput) firstInput.focus();

    return { close: closeModal, overlay };
  },

  prompt(title, placeholder = '') {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<input type="text" class="modal-input" placeholder="${placeholder}" />`,
        confirmText: 'OK',
        onConfirm: (overlay) => {
          const value = overlay.querySelector('.modal-input').value.trim();
          resolve(value || null);
        },
        onCancel: () => resolve(null),
      });
    });
  },

  confirm(title, message) {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  },

  alert(title, message) {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        confirmText: 'OK',
        cancelText: '',
        onConfirm: () => resolve(),
        onCancel: () => resolve(),
      });
    });
  },
};

const Toast = {
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">&times;</button>
    `;

    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const close = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').onclick = close;
    setTimeout(close, duration);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  info(message) {
    this.show(message, 'info');
  },
};
