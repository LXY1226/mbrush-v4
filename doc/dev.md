MBrush (PrinCube) API Document
==============

## Network Interface

 - IPv4 uses DHCP to assign addresses.
 - IPv6 uses SLAAC to assign addresses.
 - All addresses support the http and https protocols, where https shares the same self-signed certificate.
 - USB Class: CDC-ECM + RNDIS.

### UART Debug

 - Pin order: GND TX RX
 - Voltage: 3.3V
 - 3Mbps 8N1
 - User name: root
 - Password: no password

### Telnet Debug
```
$ busybox telnet 192.168.44.1
```

## API Interfaces

### /cgi-bin/cmd

```
cmd=get_info
ret: {"info": "mb: 000000000000000000000000, st: 0, i: 0, p: -1, bat: 80, dc: 0, iqc: 40, v: 4.0/s0"}
notes:
  mb: DEV_ID
  st: 0: idle, 1: printing, 2: cleaning, 3: wait trigger (constant speed mode only)
  i: data index, start from 0
  p: progress
  bat: battery
  dc: 0: not charge, 1: charging
  iqc: sensor IQC
  v: firmware version / rootfs version

cmd=rm_upload
ret: {"status": "ok"}
note: clean up /upload/ folder

cmd=sync
ret: {"status": "ok"}
note: invoke sync command

cmd=simulate&key=NUM
ret: {"status": "ok"}
note:
 NUM:
  0: reload configs (include in set_conf command)
  1: simulate short press
  2: simulate long press
  3: reset data index to 0 (include in rm_upload command)

Read and write config string:
  cmd=get_conf
  cmd=set_conf&conf=CONFIGS
  cmd=get_app_conf
  cmd=set_app_conf&app_conf=APP_CONFIGS
  cmd=get_wifi
  cmd=set_wifi&wifi=WIFI_CONFIGS
note:
The parameter period_us is not used in mb.conf by default.
If it is used and is not equal to 0,
the sensor data will be replaced with a constant printing speed.
period_us is the printing interval of each group,
in microseconds, the range is [110, 0x7ffff].
To improve the real-time performance:
the first short press loads data to ram (st 3: wait trigger), press again to start printing.

cmd=upgrade
ret: {"status": "ok"}
note: upgrade app and firmware from tarball

cmd=reboot
ret: {"status": "ok"}

cmd=eval&val=COMMAND
ret: shell command outputs
note: disabled for safety of online simulation server
```

E.g.: `http://192.168.44.1/cgi-bin/cmd?cmd=get_info`

Multi-line printing demo, constant speed mode by `period_us`:
https://youtu.be/r6bBqGQhlzU

E.g.:  
`http://192.168.88.1/cgi-bin/cmd?cmd=set_conf&conf=space%3D-200%26pos_cali%3D0%26buzzer%3D1%26strength%3D20%26period_us%3D741`  
Writes config `space=-200&pos_cali=0&buzzer=1&strength=20&period_us=741` to device.  
The CONFIGS should in URL-encoded formats.


### /cgi-bin/upload

Upload file to /upload/  

Shell command example: 
 - `curl -F "file=@0.mbd" http://192.168.44.1/cgi-bin/upload`, or: 
 - `curl -F "pos=0" -F "file=@0.mbd" http://192.168.44.1/cgi-bin/upload`, or: 
 - `curl -F "file=@xxx.mbd;filename=0.mbd" http://192.168.44.1/cgi-bin/upload`  

For javascript code, refer `upload` function in `/js/utils/helper.js`

### Image Convert

Please refer to: `tools/image_convert/`


## Additional API interfaces

These interfaces are not used by the current APP, but some users may be used for their own development.

These interfaces correspond to the following files added under the `/sys/mb/` path:

 - `key_evt`: Report short and long press events, corresponding to 1 and 2 respectively, and 0 for no events.
 - `key_raw`: Report key value: a value of 0 or 1.
 - `led`: Write integer to control the light, bit0 bit1 bit2 corresponds to 3 ways light.
 - `buzzer`: Write frequency, 0 for off sound.
 - `idx`: Modify the index value of the selected print data file.
 - `key_en`: The default is 1. After writing 0, the button no longer triggers printing. When printing is triggered via the relevant api, the led and buzzer also need to be controlled by the user.
 - `slow_evt`: A non-zero event means there is an insufficient print speed, which means the user is moving too fast.

The `key_evt`, `key_raw`, `slow_evt` and the original `state` file now support event notification, the user space program can refer to the [poll_test.c](poll_test.c) file. 
For example, after entering the following command into the serial port, try to print once: `./poll_test /sys/mb/state &`

