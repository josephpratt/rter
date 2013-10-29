package com.msterle.videoviewtest;

import com.msterle.videoviewtest.util.SystemUiHider;

import android.annotation.TargetApi;
import android.app.Activity;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.MotionEvent;
import android.view.View;
import android.widget.MediaController;
import android.widget.VideoView;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 * 
 * @see SystemUiHider
 */
public class FullscreenActivity extends Activity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
	    super.onCreate(savedInstanceState);
	    setContentView(R.layout.activity_fullscreen);
	
	    VideoView vw = (VideoView) findViewById(R.id.videoView);
	    //vw.setVideoURI(Uri.parse("http://devimages.apple.com/iphone/samples/bipbop/gear4/prog_index.m3u8"));
	    vw.setVideoURI(Uri.parse("http://rter.zapto.org:8080/v1/videos/262/index.m3u8"));
	    //
	    vw.setMediaController(new MediaController(this));
	    vw.requestFocus();
	    vw.start();
	}
}
