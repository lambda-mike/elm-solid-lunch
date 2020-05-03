(function() {
  const app = Elm.Main.init({
      node: document.getElementById('elm')
  });
  solid.auth.trackSession(session => {
      console.log('solid::trackSession', session);
      app.ports.trackSession.send(session && session.webId);
  });
  app.ports.authRequest.subscribe(() => {
      console.log('solid::popupLogin');
      const popupUri = 'popup.html';
      solid.auth.popupLogin({ popupUri });
  });
  app.ports.logout.subscribe(() => {
      console.log('solid::logout');
      solid.auth.logout();
  });
  app.ports.fetchProfile.subscribe(async function fetchProfile(person) {
      console.log('solid::fetchProfile (person)', person);

      // Set up a local data store and associated data fetcher
      const store = $rdf.graph();
      const fetcher = new $rdf.Fetcher(store);

      // Load the person's data into the store
      await fetcher.load(person);

      // Display their details
      const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
      const fullName = store.any($rdf.sym(person), FOAF('name'));
      console.log('solid::fetchProfile (fullName)', fullName);

      const friends = store.each($rdf.sym(person), FOAF('knows'));
      const friendsPromises = friends.map(friend =>
          fetcher.load(friend)
              .then(response => {
                  const name = store.any(friend, FOAF('name'));
                  return {
                      name: name && name.value || '',
                      webId: friend.value
                  };
              })
              .catch(err => { console.error('err', err); return false; })
      );
      console.log('solid::fetchProfile (friendsPromises)', friendsPromises);
      Promise.all(friendsPromises)
          .then(results => {
              const finalFriends = results.filter(x => !!x);
              const profile = {
                  fullName: fullName && fullName.value || '',
                  friends: finalFriends
              };
              console.log('solid::fetchProfile (profile)', profile);
              app.ports.loadProfile.send(profile);
          });
  });
})()
