const Auth = {
  getUser() {
    const data = localStorage.getItem('loggedInUser');
    return data ? JSON.parse(data) : null;
  },

  setUser(user) {
    localStorage.setItem('loggedInUser', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
  },

  requireAuth() {
    if (!this.getUser()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  redirectIfLoggedIn() {
    if (this.getUser()) {
      window.location.href = 'home.html';
      return true;
    }
    return false;
  },
};
