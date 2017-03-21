# Anonymity in Peer-assisted CDNs: Inference Attacks and Mitigation
### Implementation for an anonymous peer-assisted CDN (APAC)
================================================================================

--------------------------------------------------------------------------------
Authors
--------------------------------------------------------------------------------

The APAC is designed by Yaoqi Jia, Guangdong Bai, Prateek Saxena, and Zhenkai Liang;
developed and currently maintained by [Yaoqi Jia].


--------------------------------------------------------------------------------
Disclaimer
--------------------------------------------------------------------------------

The code is a research-quality proof of concept, and is still under development for more features and bug-fixing.

--------------------------------------------------------------------------------
References
--------------------------------------------------------------------------------

\[jia2016anonymity] [
    Anonymity in Peer-assisted CDNs: Inference Attacks and Mitigation
] (https://www.comp.nus.edu.sg/~jiayaoqi/publications/apac_pets.pdf)

  Yaoqi Jia, Guangdong Bai, Prateek Saxena, and Zhenkai Liang

  In the 16th Privacy Enhancing Technologies Symposium (PETS 2016)

[Yaoqi Jia]: http://www.comp.nus.edu.sg/~jiayaoqi/


--------------------------------------------------------------------------------
Instructions
--------------------------------------------------------------------------------

#### Requirement: a web server like apache2 is installed already. Assume that the directory for apache2 is `/usr/local/apache2/` and the directory of APAC-code is `~/APAC-code`.

### Setup peer server:
    $ cd ~/APAC-code/peerserver/bin
    $ node pserver.js

### Setup content server:
    $ cd /usr/local/apache2/htdocs/pw
    $ sudo /usr/local/apache2/bin/apachectl start

### Generate resource files:
    $ cd /usr/local/apache2/htdocs/pw/image
    $ node generate_hash.js
    $ cp policy.txt ~/github/peerwebcode/peerserver/bin

### Clear data in indexedDB:
    $ indexedDB.deleteDatabase("peerweb")
